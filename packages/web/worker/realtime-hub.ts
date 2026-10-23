/**
 * Realtime fan-out for row changes, replacing Supabase Realtime `postgres_changes`.
 *
 * Browsers hold one hibernatable WebSocket each (lib/db/realtime.ts). Subscriptions live in this
 * Durable Object's SQLite storage rather than socket attachments (2 KB cap), so the object can
 * hibernate between messages and still route changes after waking.
 *
 * Protocol (JSON):
 *   client -> { type: "sub", id, table, event, filter? }   filter is Supabase syntax: "column=eq.value"
 *   client -> { type: "unsub", id }
 *   server -> { type: "change", ids: string[], payload }   payload matches RealtimePostgresChangesPayload
 *   "ping" -> "pong" (auto-response, does not wake the object)
 */
import type { Response as CfResponse, DurableObjectState, Request, WebSocket } from "@cloudflare/workers-types";
import { DurableObject } from "cloudflare:workers";
import type { ChangeEvent } from "~~/lib/db/engine";

type ClientMessage =
  | { type: "sub"; id: string; table: string; event?: string; filter?: string }
  | { type: "unsub"; id: string };

type FilterOp = "eq" | "neq" | "in";

const MAX_SUBSCRIPTIONS_PER_SOCKET = 100;

function parseFilter(filter?: string): { column: string; op: FilterOp; value: string } | null {
  if (!filter) return null;
  const match = filter.match(/^([a-z_][a-z0-9_]*)=(eq|neq|in)\.(.*)$/i);
  if (!match) return null;
  return { column: match[1], op: match[2] as FilterOp, value: match[3] };
}

function matchesFilter(
  record: Record<string, unknown>,
  column: string | null,
  op: string | null,
  value: string | null,
) {
  if (!column) return true;
  const actual = record[column] === null || record[column] === undefined ? "null" : String(record[column]);
  if (op === "eq") return actual === value;
  if (op === "neq") return actual !== value;
  if (op === "in") {
    return (value ?? "")
      .replace(/^\(|\)$/g, "")
      .split(",")
      .map(entry => entry.trim().replace(/^"|"$/g, ""))
      .includes(actual);
  }
  return false;
}

export class RealtimeHub extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          socket_id TEXT NOT NULL,
          sub_id TEXT NOT NULL,
          table_name TEXT NOT NULL,
          event TEXT NOT NULL,
          filter_column TEXT,
          filter_op TEXT,
          filter_value TEXT,
          PRIMARY KEY (socket_id, sub_id)
        );
        CREATE INDEX IF NOT EXISTS idx_subscriptions_table ON subscriptions(table_name);
      `);
      // Drop subscriptions left behind by sockets that died while the object was evicted.
      const live = this.ctx.getWebSockets().map(ws => this.socketId(ws));
      if (live.length) {
        this.ctx.storage.sql.exec(
          `DELETE FROM subscriptions WHERE socket_id NOT IN (${live.map(() => "?").join(",")})`,
          ...live,
        );
      } else {
        this.ctx.storage.sql.exec("DELETE FROM subscriptions");
      }
    });
  }

  private socketId(ws: WebSocket): string {
    return (ws.deserializeAttachment() as { id: string }).id;
  }

  async fetch(request: Request): Promise<CfResponse> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 }) as unknown as CfResponse;
    }
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id: crypto.randomUUID() });
    // `webSocket` is a Workers-only ResponseInit field; the app's DOM typings don't know it.
    return new Response(null, { status: 101, webSocket: client } as ResponseInit) as unknown as CfResponse;
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    let message: ClientMessage;
    try {
      message = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      return;
    }
    const socketId = this.socketId(ws);

    if (message.type === "sub" && typeof message.id === "string" && typeof message.table === "string") {
      const count = this.ctx.storage.sql
        .exec<{ n: number }>("SELECT COUNT(*) AS n FROM subscriptions WHERE socket_id = ?", socketId)
        .one().n;
      if (count >= MAX_SUBSCRIPTIONS_PER_SOCKET) {
        ws.send(JSON.stringify({ type: "error", id: message.id, message: "too many subscriptions" }));
        return;
      }
      const filter = parseFilter(message.filter);
      this.ctx.storage.sql.exec(
        `INSERT OR REPLACE INTO subscriptions (socket_id, sub_id, table_name, event, filter_column, filter_op, filter_value)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        socketId,
        message.id,
        message.table,
        (message.event || "*").toUpperCase(),
        filter?.column ?? null,
        filter?.op ?? null,
        filter?.value ?? null,
      );
      ws.send(JSON.stringify({ type: "subscribed", id: message.id }));
    } else if (message.type === "unsub" && typeof message.id === "string") {
      this.ctx.storage.sql.exec("DELETE FROM subscriptions WHERE socket_id = ? AND sub_id = ?", socketId, message.id);
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    this.ctx.storage.sql.exec("DELETE FROM subscriptions WHERE socket_id = ?", this.socketId(ws));
    try {
      ws.close(code === 1005 ? 1000 : code, "closed");
    } catch {
      // already closed
    }
  }

  async webSocketError(ws: WebSocket) {
    this.ctx.storage.sql.exec("DELETE FROM subscriptions WHERE socket_id = ?", this.socketId(ws));
  }

  /** RPC entry point called by lib/db/server.ts after every write. */
  async publish(changes: ChangeEvent[]) {
    const sockets = new Map(this.ctx.getWebSockets().map(ws => [this.socketId(ws), ws]));
    if (!sockets.size) return;

    for (const change of changes) {
      const record = change.eventType === "DELETE" ? change.old : change.new;
      const rows = this.ctx.storage.sql
        .exec<{
          socket_id: string;
          sub_id: string;
          event: string;
          filter_column: string | null;
          filter_op: string | null;
          filter_value: string | null;
        }>(
          "SELECT socket_id, sub_id, event, filter_column, filter_op, filter_value FROM subscriptions WHERE table_name = ?",
          change.table,
        )
        .toArray();

      const idsBySocket = new Map<string, string[]>();
      for (const row of rows) {
        if (row.event !== "*" && row.event !== change.eventType) continue;
        if (!matchesFilter(record, row.filter_column, row.filter_op, row.filter_value)) continue;
        idsBySocket.set(row.socket_id, [...(idsBySocket.get(row.socket_id) ?? []), row.sub_id]);
      }

      const payload = {
        schema: "public",
        table: change.table,
        commit_timestamp: change.commit_timestamp,
        eventType: change.eventType,
        new: change.new,
        old: change.old,
        errors: null,
      };
      for (const [socketId, ids] of idsBySocket) {
        try {
          sockets.get(socketId)?.send(JSON.stringify({ type: "change", ids, payload }));
        } catch {
          // socket went away between lookup and send; webSocketClose will clean up
        }
      }
    }
  }
}

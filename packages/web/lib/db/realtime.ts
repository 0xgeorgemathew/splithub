/**
 * Browser side of realtime (see worker/realtime-hub.ts). Keeps the supabase-js channel API:
 *
 *   supabase.channel("name").on("postgres_changes", { event, schema, table, filter }, cb).subscribe()
 *   supabase.removeChannel(channel)
 *
 * All channels share one WebSocket that reconnects with backoff and re-subscribes.
 */

export type RealtimePostgresChangesPayload<T extends Record<string, any> = Record<string, any>> = {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T>;
  errors: null;
};

type ChangesFilter = { event: "*" | "INSERT" | "UPDATE" | "DELETE"; schema?: string; table: string; filter?: string };
type Binding = { id: string; filter: ChangesFilter; callback: (payload: RealtimePostgresChangesPayload<any>) => void };
type SubscribeStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

const PING_INTERVAL_MS = 25_000;

class RealtimeConnection {
  private socket: WebSocket | null = null;
  private bindings = new Map<string, Binding>();
  private retry = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private openListeners = new Set<() => void>();

  get isOpen() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  add(binding: Binding) {
    this.bindings.set(binding.id, binding);
    this.ensureConnected();
    if (this.isOpen) this.sendSub(binding);
  }

  remove(id: string) {
    if (!this.bindings.delete(id)) return;
    if (this.isOpen) this.socket!.send(JSON.stringify({ type: "unsub", id }));
    if (!this.bindings.size) this.disconnect();
  }

  onOpen(listener: () => void) {
    if (this.isOpen) {
      listener();
      return;
    }
    this.openListeners.add(listener);
  }

  private sendSub(binding: Binding) {
    this.socket!.send(
      JSON.stringify({
        type: "sub",
        id: binding.id,
        table: binding.filter.table,
        event: binding.filter.event,
        filter: binding.filter.filter,
      }),
    );
  }

  private ensureConnected() {
    if (typeof window === "undefined" || this.socket || this.reconnectTimer) return;
    const url = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/realtime`;
    const socket = new WebSocket(url);
    this.socket = socket;

    // A replaced socket (disconnect, then a quick reconnect, as in React StrictMode) must not touch the new one.
    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.retry = 0;
      this.bindings.forEach(binding => this.sendSub(binding));
      this.openListeners.forEach(listener => listener());
      this.openListeners.clear();
      this.pingTimer = setInterval(() => socket.readyState === WebSocket.OPEN && socket.send("ping"), PING_INTERVAL_MS);
    };

    socket.onmessage = event => {
      if (typeof event.data !== "string" || event.data === "pong") return;
      let message: { type: string; ids?: string[]; payload?: RealtimePostgresChangesPayload };
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.type !== "change" || !message.ids || !message.payload) return;
      for (const id of message.ids) {
        try {
          this.bindings.get(id)?.callback(message.payload);
        } catch (error) {
          console.error("[realtime] subscriber callback failed", error);
        }
      }
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = null;
      this.socket = null;
      if (!this.bindings.size) return;
      const delay = Math.min(30_000, 500 * 2 ** this.retry++) + Math.random() * 250;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.ensureConnected();
      }, delay);
    };
  }

  private disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, "no subscriptions");
  }
}

let sharedConnection: RealtimeConnection | null = null;
const getConnection = () => (sharedConnection ??= new RealtimeConnection());

let channelCounter = 0;

export class RealtimeChannel {
  private bindings: Binding[] = [];
  private subscribed = false;

  constructor(readonly topic: string) {}

  on<T extends Record<string, any> = Record<string, any>>(
    _type: "postgres_changes",
    filter: ChangesFilter,
    callback: (payload: RealtimePostgresChangesPayload<T>) => void,
  ): RealtimeChannel {
    this.bindings.push({
      id: `${this.topic}:${++channelCounter}`,
      filter,
      callback: callback as Binding["callback"],
    });
    return this;
  }

  subscribe(callback?: (status: SubscribeStatus, error?: Error) => void): RealtimeChannel {
    if (typeof window === "undefined" || this.subscribed) return this;
    this.subscribed = true;
    const connection = getConnection();
    this.bindings.forEach(binding => connection.add(binding));
    if (callback) connection.onOpen(() => callback("SUBSCRIBED"));
    return this;
  }

  async unsubscribe(): Promise<"ok"> {
    if (this.subscribed) {
      const connection = getConnection();
      this.bindings.forEach(binding => connection.remove(binding.id));
      this.subscribed = false;
    }
    return "ok";
  }
}

const channels = new Set<RealtimeChannel>();

export function createChannel(topic: string) {
  const channel = new RealtimeChannel(topic);
  channels.add(channel);
  return channel;
}

export async function removeChannel(channel: RealtimeChannel) {
  channels.delete(channel);
  return channel.unsubscribe();
}

export async function removeAllChannels() {
  const all = [...channels];
  channels.clear();
  return Promise.all(all.map(channel => channel.unsubscribe()));
}

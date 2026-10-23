/**
 * SplitHub database client: a supabase-js compatible facade over Cloudflare D1.
 *
 * - Server (route handlers, workflows, cron): plans run directly against the D1 binding.
 * - Browser: plans are POSTed to /api/db, which applies lib/db/policy.ts before running them.
 * - Realtime: `channel().on("postgres_changes", ...)` is served by the RealtimeHub Durable Object.
 */
import { QueryBuilder, QueryExecutor, QueryPlan, QueryResult } from "./query";
import { createChannel, removeAllChannels, removeChannel } from "./realtime";

const browserExecutor: QueryExecutor = async (plan: QueryPlan): Promise<QueryResult> => {
  try {
    const response = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    if (!response.ok) {
      return {
        data: null,
        error: {
          message: `Database request failed (${response.status})`,
          code: String(response.status),
          details: null,
          hint: null,
        },
        count: null,
        status: response.status,
        statusText: response.statusText,
      };
    }
    return (await response.json()) as QueryResult;
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : "Network error",
        code: "NETWORK",
        details: null,
        hint: null,
      },
      count: null,
      status: 0,
      statusText: "Network Error",
    };
  }
};

// import.meta.env.SSR is statically replaced by Vite, so the D1 module never reaches the client bundle.
const executor: QueryExecutor = import.meta.env.SSR
  ? plan => import("./server").then(module => module.runOnServer(plan))
  : browserExecutor;

export const db = {
  from: <Row = any>(table: string) => new QueryBuilder<Row>(table, executor),
  channel: createChannel,
  removeChannel,
  removeAllChannels,
};

export type { QueryResult } from "./query";
export type { RealtimeChannel, RealtimePostgresChangesPayload } from "./realtime";

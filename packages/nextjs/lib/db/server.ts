// Server only: lib/db/index.ts reaches this module behind import.meta.env.SSR, so it never ships to browsers.
import { executePlan } from "./engine";
import type { QueryPlan, QueryResult } from "./query";
import { env, waitUntil } from "cloudflare:workers";

/** Runs a plan against D1 and fans row changes out to realtime subscribers. */
export async function runOnServer(plan: QueryPlan): Promise<QueryResult> {
  const { result, changes } = await executePlan(env.DB, plan);
  if (changes.length) {
    waitUntil(
      env.REALTIME.getByName("global")
        .publish(changes)
        .catch((error: unknown) => console.error("[realtime] publish failed", error)),
    );
  }
  return result;
}

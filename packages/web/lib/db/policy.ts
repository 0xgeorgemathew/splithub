import type { QueryAction, QueryPlan } from "./query";
import { DbError, schema } from "./schema";

/**
 * What browser code may do through POST /api/db. Reads are open (parity with the old Supabase anon
 * key); writes are limited to the tables and actions client components actually perform. Store,
 * stall payment and settlement tables are only writable from server code (they are recorded after the
 * server verifies the on-chain payment).
 */
const BROWSER_WRITES: Record<string, QueryAction[]> = {
  users: ["insert", "update"],
  circles: ["insert", "update", "delete"],
  circle_members: ["insert", "delete"],
  events: ["insert", "update", "delete"],
  stalls: ["insert", "update", "delete"],
  expense: ["insert", "delete"],
  expense_participants: ["insert"],
  payment_requests: ["delete"],
};

export function assertBrowserPlanAllowed(plan: QueryPlan) {
  if (!plan || typeof plan.table !== "string" || !schema[plan.table]) {
    throw new DbError(`relation "public.${plan?.table}" does not exist`, "42P01");
  }
  if (plan.action === "select") return;

  if (!BROWSER_WRITES[plan.table]?.includes(plan.action)) {
    throw new DbError(`permission denied: ${plan.action} on ${plan.table}`, "42501");
  }
  if ((plan.action === "update" || plan.action === "delete") && plan.filters.length === 0) {
    throw new DbError(`${plan.action} on ${plan.table} requires a filter`, "21000");
  }
}

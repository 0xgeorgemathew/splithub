import type { QueryAction, QueryPlan } from "./query";
import { DbError, schema } from "./schema";

/**
 * What browser code may do through POST /api/db. Reads are open (parity with the old Supabase anon
 * key); writes are limited to the tables and actions client components actually perform. Users (via
 * /api/user/*), venues,
 * stalls and stores change through authenticated API routes (owner checks in lib/auth.ts), and stall
 * payments and settlements are recorded by the server after it verifies the on-chain payment.
 */
const BROWSER_WRITES: Record<string, QueryAction[]> = {
  circles: ["insert", "update", "delete"],
  circle_members: ["insert", "delete"],
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

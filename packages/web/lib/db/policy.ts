import type { QueryAction, QueryPlan } from "./query";
import { DbError, schema } from "./schema";

/**
 * What browser code may do through POST /api/db.
 *
 * Reads are open (parity with the old Supabase anon key). Writes need a signed-in caller and are limited to
 * the tables and actions client components perform, each with an ownership rule below. Users, venues,
 * stalls, stores and store items change through authenticated API routes, and stall payments, store orders
 * and settlements are recorded by the server after it verifies the onchain payment.
 */
const BROWSER_WRITES: Record<string, QueryAction[]> = {
  circles: ["insert", "update", "delete"],
  circle_members: ["insert", "delete"],
  expense: ["insert", "delete"],
  expense_participants: ["insert"],
  payment_requests: ["delete"],
};

type Row = Record<string, unknown>;

/** Loads rows from the database for ownership checks (runs on the server). */
export type RowLoader = (table: string, column: string, values: unknown[]) => Promise<Row[]>;

const same = (a: unknown, b: string) => typeof a === "string" && a.toLowerCase() === b;

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

function deny(message: string): never {
  throw new DbError(`permission denied: ${message}`, "42501");
}

async function circlesOwnedBy(load: RowLoader, circleIds: unknown[], wallet: string) {
  const circles = await load("circles", "id", circleIds);
  return new Set(circles.filter(circle => same(circle.creator_wallet, wallet)).map(circle => circle.id));
}

/**
 * Ownership rules for browser writes. `rows` are the rows an update/delete plan matches (selected with the
 * plan's own filters before it runs), so a broad filter cannot reach other users' data.
 */
export async function assertBrowserWriteOwned(plan: QueryPlan, wallet: string, rows: Row[], load: RowLoader) {
  const values = plan.values === undefined ? [] : Array.isArray(plan.values) ? plan.values : [plan.values];

  switch (plan.table) {
    case "circles":
      if (plan.action === "insert") {
        if (!values.every(row => same(row.creator_wallet, wallet))) deny("circles must be created by you");
      } else {
        if (!rows.every(row => same(row.creator_wallet, wallet))) deny("only the circle creator can change it");
        if (values.some(row => "creator_wallet" in row)) deny("circle owner cannot be changed");
      }
      return;

    case "circle_members": {
      if (plan.action === "insert") {
        const owned = await circlesOwnedBy(
          load,
          values.map(row => row.circle_id),
          wallet,
        );
        if (!values.every(row => owned.has(row.circle_id))) deny("only the circle creator can add members");
      } else {
        const owned = await circlesOwnedBy(
          load,
          rows.map(row => row.circle_id),
          wallet,
        );
        if (!rows.every(row => owned.has(row.circle_id) || same(row.member_wallet, wallet))) {
          deny("only the circle creator can remove other members");
        }
      }
      return;
    }

    case "expense":
      if (plan.action === "insert") {
        if (!values.every(row => same(row.creator_wallet, wallet))) deny("expenses must be created by you");
      } else if (!rows.every(row => same(row.creator_wallet, wallet))) {
        deny("only the expense creator can delete it");
      }
      return;

    case "expense_participants": {
      const expenses = await load(
        "expense",
        "id",
        values.map(row => row.expense_id),
      );
      const owned = new Set(
        expenses.filter(expense => same(expense.creator_wallet, wallet)).map(expense => expense.id),
      );
      if (!values.every(row => owned.has(row.expense_id))) deny("only the expense creator can add participants");
      return;
    }

    case "payment_requests":
      if (!rows.every(row => same(row.recipient, wallet) || same(row.payer, wallet))) {
        deny("only the requester or payer can remove a payment request");
      }
      return;

    default:
      deny(`${plan.action} on ${plan.table}`);
  }
}

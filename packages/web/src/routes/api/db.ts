import { createFileRoute } from "@tanstack/react-router";
import { AuthError, requireUser } from "~~/lib/auth";
import { type RowLoader, assertBrowserPlanAllowed, assertBrowserWriteOwned } from "~~/lib/db/policy";
import type { QueryPlan } from "~~/lib/db/query";
import { DbError } from "~~/lib/db/schema";
import { runOnServer } from "~~/lib/db/server";

const forbidden = (error: DbError) =>
  Response.json(
    { data: null, error: error.toJSON(), count: null, status: 403, statusText: "Forbidden" },
    { status: 200 },
  );

const loadRows: RowLoader = async (table, column, values) => {
  const ids = [...new Set(values.filter(value => value !== undefined && value !== null))];
  if (!ids.length) return [];
  const { data } = await runOnServer({
    table,
    action: "select",
    columns: "*",
    returning: false,
    filters: [{ kind: "op", column, op: "in", value: ids }],
    order: [],
  } as QueryPlan);
  return (data as Record<string, unknown>[]) ?? [];
};

/** Executes query plans built by browser code (lib/supabase.ts) against D1. */
async function POST(request: Request) {
  let plan: QueryPlan;
  try {
    plan = (await request.json()) as QueryPlan;
    assertBrowserPlanAllowed(plan);

    if (plan.action !== "select") {
      const { wallet } = await requireUser(request);
      // Rows the write would touch, selected with the plan's own filters.
      const rows =
        plan.action === "update" || plan.action === "delete"
          ? (((
              await runOnServer({
                ...plan,
                action: "select",
                columns: "*",
                values: undefined,
                cardinality: undefined,
                head: false,
                count: undefined,
              })
            ).data as Record<string, unknown>[]) ?? [])
          : [];
      await assertBrowserWriteOwned(plan, wallet, rows, loadRows);
    }
  } catch (error) {
    if (error instanceof AuthError) return forbidden(new DbError(error.message, "42501"));
    return forbidden(error instanceof DbError ? error : new DbError("Invalid query plan", "PGRST100"));
  }

  return Response.json(await runOnServer(plan));
}

export const Route = createFileRoute("/api/db")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

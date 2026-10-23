import { createFileRoute } from "@tanstack/react-router";
import { assertBrowserPlanAllowed } from "~~/lib/db/policy";
import type { QueryPlan } from "~~/lib/db/query";
import { DbError } from "~~/lib/db/schema";
import { runOnServer } from "~~/lib/db/server";

/** Executes query plans built by browser code (lib/supabase.ts) against D1. */
async function POST(request: Request) {
  let plan: QueryPlan;
  try {
    plan = (await request.json()) as QueryPlan;
    assertBrowserPlanAllowed(plan);
  } catch (error) {
    const dbError = error instanceof DbError ? error : new DbError("Invalid query plan", "PGRST100");
    return Response.json(
      { data: null, error: dbError.toJSON(), count: null, status: 403, statusText: "Forbidden" },
      { status: 200 },
    );
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

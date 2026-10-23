import { NextRequest, NextResponse } from "next/server";
import { assertBrowserPlanAllowed } from "~~/lib/db/policy";
import type { QueryPlan } from "~~/lib/db/query";
import { DbError } from "~~/lib/db/schema";
import { runOnServer } from "~~/lib/db/server";

export const dynamic = "force-dynamic";

/** Executes query plans built by browser code (lib/supabase.ts) against D1. */
export async function POST(request: NextRequest) {
  let plan: QueryPlan;
  try {
    plan = (await request.json()) as QueryPlan;
    assertBrowserPlanAllowed(plan);
  } catch (error) {
    const dbError = error instanceof DbError ? error : new DbError("Invalid query plan", "PGRST100");
    return NextResponse.json(
      { data: null, error: dbError.toJSON(), count: null, status: 403, statusText: "Forbidden" },
      { status: 200 },
    );
  }

  return NextResponse.json(await runOnServer(plan));
}

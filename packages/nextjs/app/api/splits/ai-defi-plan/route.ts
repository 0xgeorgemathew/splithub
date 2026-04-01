import { NextResponse } from "next/server";
import { buildSplitsDefiSnapshot, getSplitsDefiPlan } from "~~/services/splitsDefiPlannerService";

export async function POST() {
  try {
    const snapshot = await buildSplitsDefiSnapshot();
    const { plan, source } = await getSplitsDefiPlan(snapshot);

    return NextResponse.json({
      snapshot,
      plan,
      source,
      plannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Splits AI DeFi plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Plan generation failed" },
      { status: 500 },
    );
  }
}

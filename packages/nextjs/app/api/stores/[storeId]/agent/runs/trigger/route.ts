import { NextRequest, NextResponse } from "next/server";
import { executeAutonomousStoreRun } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const body = await request.json().catch(() => ({}));
    const triggerSource = body.triggerSource || "manual";

    const result = await executeAutonomousStoreRun(Number(storeId), triggerSource);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Trigger store agent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger store agent" },
      { status: 500 },
    );
  }
}

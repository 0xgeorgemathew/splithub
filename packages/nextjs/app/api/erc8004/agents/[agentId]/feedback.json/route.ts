import { NextRequest, NextResponse } from "next/server";
import { buildLatestFeedbackPayload } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId } = await params;
    const runId = request.nextUrl.searchParams.get("runId");
    const payload = await buildLatestFeedbackPayload(agentId, runId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("ERC-8004 feedback payload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build feedback payload" },
      { status: 500 },
    );
  }
}

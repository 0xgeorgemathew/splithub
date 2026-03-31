import { NextRequest, NextResponse } from "next/server";
import { getAgentLogs } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId } = await params;
    const logs = await getAgentLogs(agentId);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Agent logs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch agent logs" },
      { status: 500 },
    );
  }
}

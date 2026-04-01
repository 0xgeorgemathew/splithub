import { NextRequest, NextResponse } from "next/server";
import { buildRegistrationPayload } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId } = await params;
    const payload = await buildRegistrationPayload(agentId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("ERC-8004 registration payload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build registration payload" },
      { status: 500 },
    );
  }
}

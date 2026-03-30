import { NextRequest, NextResponse } from "next/server";
import { pauseManagerAgent } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const body = await request.json().catch(() => ({}));
    const status = body.status === "active" ? "active" : "paused";
    const agent = await pauseManagerAgent(Number(storeId), status);
    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Pause store agent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update store agent" },
      { status: 500 },
    );
  }
}

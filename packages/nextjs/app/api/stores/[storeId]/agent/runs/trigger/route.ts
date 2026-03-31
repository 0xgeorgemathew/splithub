import { tasks } from "@trigger.dev/sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const body = await request.json().catch(() => ({}));
    const triggerSource = body.triggerSource || "manual";

    const handle = await tasks.trigger("store-agent-run", {
      storeId: Number(storeId),
      triggerSource,
    });

    return NextResponse.json({
      queued: true,
      handle,
    });
  } catch (error) {
    console.error("Trigger store agent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to queue store agent" },
      { status: 500 },
    );
  }
}

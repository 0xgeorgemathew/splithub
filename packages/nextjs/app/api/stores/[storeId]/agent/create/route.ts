import { NextRequest, NextResponse } from "next/server";
import { createManagerAgentForStore } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function POST(_: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const agent = await createManagerAgentForStore(Number(storeId));
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error("Create store agent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create store agent" },
      { status: 500 },
    );
  }
}

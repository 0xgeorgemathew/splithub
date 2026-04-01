import { NextRequest, NextResponse } from "next/server";
import { confirmManagerIdentityRegistration } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const body = await request.json();
    const txHash = body.txHash as `0x${string}`;

    if (!txHash) {
      return NextResponse.json({ error: "txHash is required" }, { status: 400 });
    }

    const trustAgent = await confirmManagerIdentityRegistration(Number(storeId), txHash);
    return NextResponse.json({ trustAgent });
  } catch (error) {
    console.error("Confirm manager trust registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm manager trust registration" },
      { status: 500 },
    );
  }
}

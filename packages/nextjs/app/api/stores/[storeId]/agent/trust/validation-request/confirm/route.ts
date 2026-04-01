import { NextRequest, NextResponse } from "next/server";
import { confirmManagerValidationRequest } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const body = await request.json();
    const txHash = body.txHash as `0x${string}`;
    const validationId = body.validationId as string;

    if (!txHash || !validationId) {
      return NextResponse.json({ error: "validationId and txHash are required" }, { status: 400 });
    }

    const result = await confirmManagerValidationRequest(Number(storeId), validationId, txHash);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Confirm manager validation request error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm manager validation request" },
      { status: 500 },
    );
  }
}

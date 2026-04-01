import { NextRequest, NextResponse } from "next/server";
import { prepareManagerValidationRequest } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function POST(_: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const result = await prepareManagerValidationRequest(Number(storeId));
    return NextResponse.json(result);
  } catch (error) {
    console.error("Prepare manager validation request error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare manager validation request" },
      { status: 500 },
    );
  }
}

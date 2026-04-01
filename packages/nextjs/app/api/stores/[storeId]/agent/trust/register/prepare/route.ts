import { NextRequest, NextResponse } from "next/server";
import { prepareManagerIdentityRegistration } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function POST(_: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const result = await prepareManagerIdentityRegistration(Number(storeId));
    return NextResponse.json(result);
  } catch (error) {
    console.error("Prepare manager trust registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare manager trust registration" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getStoreAnalytics } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const analytics = await getStoreAnalytics(Number(storeId));
    return NextResponse.json({ analytics });
  } catch (error) {
    console.error("Store analytics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch store analytics" },
      { status: 500 },
    );
  }
}

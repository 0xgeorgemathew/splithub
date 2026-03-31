import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { getStoreDashboardData } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ error: "Valid wallet query param is required" }, { status: 400 });
    }

    const dashboard = await getStoreDashboardData(wallet);
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Store dashboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch store dashboard" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getPaymentReadiness } from "~~/services/paymentReadinessService";

/**
 * GET /api/vincent/readiness?walletAddress=0x...
 *
 * Returns payment readiness state:
 * - ready: whether the CHIP payment path is immediately spendable
 * - liquid reserve, Aave reserve, shortfall, whether withdraw is needed
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress parameter" }, { status: 400 });
    }

    const readiness = await getPaymentReadiness(walletAddress);

    return NextResponse.json(readiness);
  } catch (error) {
    console.error("Readiness check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Readiness check failed" },
      { status: 500 },
    );
  }
}

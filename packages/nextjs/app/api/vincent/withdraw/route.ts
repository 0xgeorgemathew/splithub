import { NextRequest, NextResponse } from "next/server";
import { executeAaveWithdraw } from "~~/services/vincentExecutionService";

/**
 * POST /api/vincent/withdraw
 *
 * Execute an Aave withdraw through Vincent to cover a reserve shortfall.
 *
 * Body: { amount: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { amount } = (await request.json()) as { amount?: string };

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const result = await executeAaveWithdraw(amount);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Vincent withdraw error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Withdraw failed" }, { status: 500 });
  }
}

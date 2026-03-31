import { NextRequest, NextResponse } from "next/server";
import { buildFundAgentTransaction } from "~~/services/internalTreasuryService";

/**
 * POST /api/vincent/fund-agent
 *
 * Returns the unsigned transaction data needed to transfer USDC
 * from the user's Privy wallet to the shared Vincent smart account.
 *
 * The actual signing and submission happens client-side through the
 * Privy embedded wallet.
 *
 * Body: { amount: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { amount } = (await request.json()) as { amount?: string };

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const tx = await buildFundAgentTransaction({ amount });

    return NextResponse.json({
      tx: {
        to: tx.to,
        data: tx.data,
        value: tx.value.toString(),
      },
      targetSmartAccount: tx.targetSmartAccount,
      amount,
    });
  } catch (error) {
    console.error("Fund agent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build funding tx" },
      { status: 500 },
    );
  }
}

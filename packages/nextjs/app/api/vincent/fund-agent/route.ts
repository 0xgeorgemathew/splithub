import { NextRequest, NextResponse } from "next/server";
import { requireVincentAppUser } from "~~/lib/vincent";
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
    const { amount, asset } = (await request.json()) as { amount?: string; asset?: "USDC" | "ETH" };

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const vincentUser = await requireVincentAppUser(request);
    const tx = await buildFundAgentTransaction({
      amount,
      asset: asset ?? "USDC",
      targetWalletAddress: vincentUser.pkpAddress,
    });

    return NextResponse.json({
      tx: {
        to: tx.to,
        data: tx.data,
        value: tx.value.toString(),
      },
      targetSmartAccount: vincentUser.agentAddress,
      targetVincentWallet: tx.targetVincentWallet,
      asset: tx.asset,
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

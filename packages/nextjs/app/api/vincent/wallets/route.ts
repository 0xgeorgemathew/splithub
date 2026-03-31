import { NextRequest, NextResponse } from "next/server";
import { requireVincentAppUser } from "~~/lib/vincent";
import { getSpendSignals } from "~~/services/spendSignalService";
import { getWalletSnapshot } from "~~/services/vincentWalletService";

/**
 * GET /api/vincent/wallets?walletAddress=0x...
 *
 * Returns the full wallet snapshot combining:
 * - Privy wallet USDC balance
 * - Vincent agent wallet liquid USDC
 * - Aave supplied/withdrawable amounts
 * - Spend signals from SplitHub payment data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress parameter" }, { status: 400 });
    }

    const vincentUser = await requireVincentAppUser(request);
    const [snapshot, spendSignals] = await Promise.all([
      getWalletSnapshot({
        observedWalletAddress: walletAddress,
        vincentWalletAddress: vincentUser.pkpAddress,
        agentAddress: vincentUser.agentAddress,
      }),
      getSpendSignals(walletAddress),
    ]);

    return NextResponse.json({ snapshot, spendSignals });
  } catch (error) {
    console.error("Vincent wallets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch wallet state" },
      { status: 500 },
    );
  }
}

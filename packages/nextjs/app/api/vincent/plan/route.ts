import { NextRequest, NextResponse } from "next/server";
import { formatUnits } from "viem";
import { TOKEN_DECIMALS } from "~~/config/tokens";
import { requireVincentAppUser } from "~~/lib/vincent";
import { type PlannerSnapshot, getCapitalAllocationPlan } from "~~/services/agentPlannerService";
import { getMockDefiVenueCandidates } from "~~/services/defiVenueService";
import { getSpendSignals } from "~~/services/spendSignalService";
import { getWalletSnapshot } from "~~/services/vincentWalletService";

/**
 * POST /api/vincent/plan
 *
 * Generates a capital allocation plan for the user's wallets.
 *
 * Body: { walletAddress: string }
 *
 * Returns:
 * - snapshot used
 * - plan (actions + reasoning)
 * - source (llm | fallback)
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = (await request.json()) as { walletAddress?: string };

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    const vincentUser = await requireVincentAppUser(request);
    // Build snapshot in parallel
    const [walletSnapshot, spendSignals] = await Promise.all([
      getWalletSnapshot({
        observedWalletAddress: walletAddress,
        vincentWalletAddress: vincentUser.pkpAddress,
        agentAddress: vincentUser.agentAddress,
      }),
      getSpendSignals(walletAddress),
    ]);
    const totalDeployableRaw = BigInt(walletSnapshot.privyUsdcRaw) + BigInt(walletSnapshot.agentLiquidUsdcRaw);
    const maxDailyDeploymentUsd = formatUnits(totalDeployableRaw, TOKEN_DECIMALS.USDC);

    // Compute deterministic bounds
    const plannerSnapshot: PlannerSnapshot = {
      privyWallet: {
        tokens: [
          {
            symbol: "USDC",
            balance: walletSnapshot.privyUsdc,
            usdValue: walletSnapshot.privyUsdc,
          },
        ],
      },
      candidateVenues: getMockDefiVenueCandidates(),
      agentWallet: {
        liquidUsdc: walletSnapshot.agentLiquidUsdc,
        aaveSuppliedUsdc: walletSnapshot.agentAaveSuppliedUsdc,
        availableToWithdrawUsdc: walletSnapshot.agentAaveWithdrawableUsdc,
      },
      spendProfile: {
        pendingRequestsUsd: spendSignals.pendingRequestsUsd,
        sevenDayMedianSpendUsd: spendSignals.sevenDayMedianSpendUsd,
        maxSingleExpectedSpendUsd: spendSignals.maxSingleExpectedSpendUsd,
      },
      policyBounds: {
        minReserveUsd: "0.00",
        maxDailyDeploymentUsd,
        supportedAssets: ["USDC"],
      },
    };

    const { plan, source } = await getCapitalAllocationPlan(plannerSnapshot);

    return NextResponse.json({
      snapshot: plannerSnapshot,
      plan,
      source,
      plannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Vincent plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Plan generation failed" },
      { status: 500 },
    );
  }
}

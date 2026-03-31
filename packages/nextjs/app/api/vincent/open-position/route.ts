import { NextRequest, NextResponse } from "next/server";
import { formatUnits } from "viem";
import { TOKEN_DECIMALS } from "~~/config/tokens";
import { requireVincentAppUser } from "~~/lib/vincent";
import { type PlannerSnapshot, getCapitalAllocationPlan } from "~~/services/agentPlannerService";
import { getMockDefiVenueCandidates } from "~~/services/defiVenueService";
import { getSpendSignals } from "~~/services/spendSignalService";
import { executeAaveSupplyRaw, waitForConfirmedBaseTransaction } from "~~/services/vincentExecutionService";
import { getUsdcBalanceRaw, getWalletSnapshot } from "~~/services/vincentWalletService";

async function waitForUsdcBalance(walletAddress: string, minBalanceRaw: bigint, attempts = 8, delayMs = 750) {
  let latestBalance = 0n;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    latestBalance = await getUsdcBalanceRaw(walletAddress);
    if (latestBalance >= minBalanceRaw) {
      return latestBalance;
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return latestBalance;
}

/**
 * POST /api/vincent/open-position
 *
 * One-click open Aave position:
 * 1. Generate fresh planner recommendation
 * 2. Move Privy USDC into Vincent when needed
 * 3. Execute aave_supply for the full liquid balance already in Vincent
 *
 * Body: { walletAddress: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress, skipFunding } = (await request.json()) as { walletAddress?: string; skipFunding?: boolean };

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    const vincentUser = await requireVincentAppUser(request);
    // 1. Build fresh snapshot
    const [walletSnapshot, spendSignals] = await Promise.all([
      getWalletSnapshot({
        observedWalletAddress: walletAddress,
        vincentWalletAddress: vincentUser.pkpAddress,
        agentAddress: vincentUser.agentAddress,
      }),
      getSpendSignals(walletAddress),
    ]);
    const privyUsdcRaw = BigInt(walletSnapshot.privyUsdcRaw);
    const agentLiquidUsdcRaw = BigInt(walletSnapshot.agentLiquidUsdcRaw);
    const totalDeployableRaw = privyUsdcRaw + agentLiquidUsdcRaw;
    const maxDailyDeploymentUsd = formatUnits(totalDeployableRaw, TOKEN_DECIMALS.USDC);

    const plannerSnapshot: PlannerSnapshot = {
      privyWallet: {
        tokens: [{ symbol: "USDC", balance: walletSnapshot.privyUsdc, usdValue: walletSnapshot.privyUsdc }],
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

    // 2. Get plan
    const { plan, source } = await getCapitalAllocationPlan(plannerSnapshot);

    const supplyAction = plan.actions.find(a => a.type === "aave_supply");

    const executionResults: Array<{
      action: string;
      success: boolean;
      txHash?: string;
      vincentStatus?: string;
      error?: string;
    }> = [];

    if (!skipFunding && privyUsdcRaw > 0n) {
      const fundAmount = formatUnits(privyUsdcRaw, TOKEN_DECIMALS.USDC);
      return NextResponse.json({
        plan: {
          targetReserveUsd: "0.00",
          actions: [
            { type: "fund_agent_wallet", asset: "USDC", amount: fundAmount },
            { type: "aave_supply", asset: "USDC", amount: formatUnits(totalDeployableRaw, TOKEN_DECIMALS.USDC) },
          ],
          reasoning:
            "The Privy wallet holds deployable USDC, so the flow first moves that USDC into the agent wallet and then deploys the full agent wallet balance into the Aave position. The mocked Morpho Blue, Compound V3, and Balancer venues are intentionally rejected because their mocked outlook is worse than Aave.",
        },
        source,
        fundRequired: true,
        fundAmount,
        fundSteps: [{ asset: "USDC", amount: fundAmount, reason: "agent_liquidity" }],
        executionResults,
        plannedAt: new Date().toISOString(),
      });
    }

    const deployAmountRaw = skipFunding ? await waitForUsdcBalance(vincentUser.pkpAddress, 1n) : agentLiquidUsdcRaw;
    if (deployAmountRaw > 0n) {
      const result = await executeAaveSupplyRaw(vincentUser, deployAmountRaw);
      executionResults.push({
        action: "aave_supply",
        success: result.success,
        txHash: result.txHash,
        vincentStatus: result.vincentStatus,
        error: result.error,
      });

      if (!result.success || !result.txHash) {
        return NextResponse.json(
          {
            error: result.error || "Failed to deploy idle balance into Aave",
            plan,
            source,
            fundRequired: false,
            fundAmount: null,
            executionResults,
            plannedAt: new Date().toISOString(),
          },
          { status: 502 },
        );
      }

      await waitForConfirmedBaseTransaction(result.txHash);

      return NextResponse.json({
        plan: {
          ...plan,
          actions: [{ type: "aave_supply", asset: "USDC", amount: formatUnits(deployAmountRaw, TOKEN_DECIMALS.USDC) }],
        },
        source,
        fundRequired: false,
        fundAmount: null,
        fundSteps: [],
        executionResults,
        plannedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      plan: {
        targetReserveUsd: "0.00",
        actions: [{ type: "no_action", asset: "USDC", amount: "0" }],
        reasoning:
          "No liquid reserve is currently sitting in the Vincent wallet, so there is nothing to deploy. Aave remains the preferred venue and the mocked Morpho Blue, Compound V3, and Balancer options are not attractive enough to use.",
      },
      source,
      fundRequired: false,
      fundAmount: null,
      fundSteps: [],
      executionResults,
      plannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Open position error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Open position failed" },
      { status: 500 },
    );
  }
}

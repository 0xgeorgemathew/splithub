import { NextRequest, NextResponse } from "next/server";
import { type PlannerSnapshot, getCapitalAllocationPlan } from "~~/services/agentPlannerService";
import { getSpendSignals } from "~~/services/spendSignalService";
import { executeAaveSupply } from "~~/services/vincentExecutionService";
import { getWalletSnapshot } from "~~/services/vincentWalletService";

/**
 * POST /api/vincent/open-position
 *
 * One-click open Aave position:
 * 1. Generate fresh planner recommendation
 * 2. If funding is required, return it for client-side Privy execution
 * 3. Otherwise execute aave_supply through Vincent
 *
 * Body: { walletAddress: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = (await request.json()) as { walletAddress?: string };

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    // 1. Build fresh snapshot
    const [walletSnapshot, spendSignals] = await Promise.all([
      getWalletSnapshot(walletAddress),
      getSpendSignals(walletAddress),
    ]);

    const plannerSnapshot: PlannerSnapshot = {
      privyWallet: {
        tokens: [{ symbol: "USDC", balance: walletSnapshot.privyUsdc, usdValue: walletSnapshot.privyUsdc }],
      },
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
        maxDailyDeploymentUsd: "200.00",
        supportedAssets: ["USDC"],
      },
    };

    // 2. Get plan
    const { plan, source } = await getCapitalAllocationPlan(plannerSnapshot);

    // 3. Check if plan includes fund_agent_wallet (must happen client-side first)
    const fundAction = plan.actions.find(a => a.type === "fund_agent_wallet");
    const supplyAction = plan.actions.find(a => a.type === "aave_supply");

    const executionResults: Array<{
      action: string;
      success: boolean;
      txHash?: string;
      vincentStatus?: string;
      error?: string;
    }> = [];

    if (fundAction) {
      return NextResponse.json({
        plan,
        source,
        fundRequired: true,
        fundAmount: fundAction.amount,
        executionResults,
        plannedAt: new Date().toISOString(),
      });
    }

    if (supplyAction?.amount) {
      const result = await executeAaveSupply(supplyAction.amount);
      executionResults.push({
        action: "aave_supply",
        success: result.success,
        txHash: result.txHash,
        vincentStatus: result.vincentStatus,
        error: result.error,
      });
    }

    return NextResponse.json({
      plan,
      source,
      fundRequired: false,
      fundAmount: null,
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

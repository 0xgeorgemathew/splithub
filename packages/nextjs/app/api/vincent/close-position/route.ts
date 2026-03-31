import { NextRequest, NextResponse } from "next/server";
import { formatUnits } from "viem";
import { TOKEN_DECIMALS } from "~~/config/tokens";
import { requireVincentAppUser } from "~~/lib/vincent";
import {
  executeAaveWithdrawAll,
  executeAgentTokenTransfer,
  waitForConfirmedBaseTransaction,
} from "~~/services/vincentExecutionService";
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
 * POST /api/vincent/close-position
 *
 * One-click close Aave position:
 * 1. Read the latest Vincent wallet snapshot
 * 2. Withdraw the full Aave-backed USDC to Vincent's smart account
 * 3. Transfer the withdrawn USDC back to the user's Privy wallet
 *
 * Body: { walletAddress: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = (await request.json()) as { walletAddress?: string };

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    const vincentUser = await requireVincentAppUser(request);
    const walletSnapshot = await getWalletSnapshot({
      observedWalletAddress: walletAddress,
      vincentWalletAddress: vincentUser.pkpAddress,
      agentAddress: vincentUser.agentAddress,
    });
    const withdrawAmountRaw = BigInt(walletSnapshot.agentAaveWithdrawableUsdcRaw);
    let withdrawResult:
      | {
          success: boolean;
          txHash?: string;
          vincentStatus?: "executed" | "denied" | "pending_approval";
          error?: string;
        }
      | null = null;

    if (withdrawAmountRaw > 0n) {
      withdrawResult = await executeAaveWithdrawAll(vincentUser);
      if (!withdrawResult.success || !withdrawResult.txHash) {
        return NextResponse.json(
          {
            error: withdrawResult.error || "Failed to withdraw from Aave",
            withdrawResult,
          },
          { status: 502 },
        );
      }

      await waitForConfirmedBaseTransaction(withdrawResult.txHash);
    }

    const transferAmountRaw =
      withdrawAmountRaw > 0n
        ? await waitForUsdcBalance(vincentUser.pkpAddress, 1n)
        : BigInt(walletSnapshot.agentLiquidUsdcRaw);
    if (transferAmountRaw <= 0n) {
      return NextResponse.json(
        {
          error: "No USDC available in the Vincent wallet to return to the Privy wallet",
          withdrawResult,
        },
        { status: 400 },
      );
    }

    const normalizedAmount = formatUnits(transferAmountRaw, TOKEN_DECIMALS.USDC);
    const transferResult = await executeAgentTokenTransfer(vincentUser, walletAddress, normalizedAmount);
    if (!transferResult.success || !transferResult.txHash) {
      return NextResponse.json(
        {
          error: transferResult.error || "Failed to transfer funds to Privy wallet",
          withdrawResult,
          transferResult,
        },
        { status: 502 },
      );
    }

    await waitForConfirmedBaseTransaction(transferResult.txHash);

    return NextResponse.json({
      amount: normalizedAmount,
      withdrawResult,
      transferResult,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Close position error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Close position failed" },
      { status: 500 },
    );
  }
}

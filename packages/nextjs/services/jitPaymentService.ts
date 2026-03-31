import { formatUnits } from "viem";
import { TOKENS } from "~~/config/tokens";
import { createFreshBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { ERC20_ABI } from "~~/lib/contractAbis";
import type { VincentAppUserContext } from "~~/lib/vincent";
import { getMockDefiVenueCandidates } from "~~/services/defiVenueService";
import { generateJitFundingReasoning } from "~~/services/jitReasoningService";
import { getUserTapLimit } from "~~/services/userService";
import {
  executeAaveWithdraw,
  executeAgentTokenTransfer,
  waitForConfirmedBaseTransaction,
} from "~~/services/vincentExecutionService";
import { getWalletSnapshot } from "~~/services/vincentWalletService";

export interface JitPaymentPreparation {
  tapLimitUsd: string;
  fundedWalletBalanceUsd: string;
  fundedWallet: string;
  shortfallUsd: string;
  fundingSource: "chip_balance" | "agent_liquid" | "aave_withdraw" | "insufficient_backing";
  reasoning: string;
  reasoningSource: "llm" | "fallback";
  withdrewFromAave: boolean;
  transferredToFundedWallet: boolean;
  withdrawalTxHash?: string;
  transferTxHash?: string;
}

async function waitForUsdcBalance(
  walletAddress: string,
  minBalanceUsd: number,
  decimals: number,
  attempts = 8,
  delayMs = 750,
) {
  let latestBalance = 0;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    latestBalance = Number.parseFloat(await getWalletTokenBalance(walletAddress, TOKENS.USDC, decimals));
    if (latestBalance + 0.000001 >= minBalanceUsd) {
      return latestBalance;
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return latestBalance;
}

async function getWalletTokenBalance(
  walletAddress: string,
  tokenAddress: `0x${string}`,
  decimals: number,
): Promise<string> {
  const client = createFreshBaseSepoliaPublicClient();
  const rawBalance = await client.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [walletAddress as `0x${string}`],
  });

  return formatUnits(rawBalance as bigint, decimals);
}

export async function prepareJitTapPayment(params: {
  payerWallet: string;
  amount: string;
  tokenAddress: string;
  decimals: number;
  vincentContext: Pick<VincentAppUserContext, "pkpAddress" | "agentAddress">;
  limitWallet?: string;
  fundingTargetWallet?: string;
}): Promise<JitPaymentPreparation> {
  if (params.tokenAddress.toLowerCase() !== TOKENS.USDC.toLowerCase()) {
    throw new Error("Unsupported payment token for JIT tap funding");
  }

  const paymentAmount = Number.parseFloat(params.amount);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const limitWallet = params.limitWallet ?? params.payerWallet;
  const fundingTargetWallet = params.fundingTargetWallet ?? params.payerWallet;

  const [tapLimitUsd, payerBalance, walletSnapshot] = await Promise.all([
    getUserTapLimit(limitWallet),
    getWalletTokenBalance(fundingTargetWallet, TOKENS.USDC, params.decimals),
    getWalletSnapshot({
      observedWalletAddress: fundingTargetWallet,
      vincentWalletAddress: params.vincentContext.pkpAddress,
      agentAddress: params.vincentContext.agentAddress,
    }),
  ]);

  if (paymentAmount > tapLimitUsd) {
    throw new Error(`Payment amount ${paymentAmount.toFixed(2)} exceeds tap limit ${tapLimitUsd.toFixed(2)}`);
  }

  const payerBalanceUsd = Number.parseFloat(payerBalance);
  const liquidAgentUsd = Number.parseFloat(walletSnapshot.agentLiquidUsdc);
  const aaveWithdrawableUsd = Number.parseFloat(walletSnapshot.agentAaveWithdrawableUsdc);
  const shortfallUsd = Math.max(0, paymentAmount - payerBalanceUsd);
  const reasoningResult = await generateJitFundingReasoning({
    tapAmountUsd: paymentAmount.toFixed(2),
    tapLimitUsd: tapLimitUsd.toFixed(2),
    chipWalletBalanceUsd: payerBalanceUsd.toFixed(2),
    shortfallUsd: shortfallUsd.toFixed(2),
    agentLiquidUsd: liquidAgentUsd.toFixed(2),
    aaveReserveUsd: aaveWithdrawableUsd.toFixed(2),
    venues: getMockDefiVenueCandidates(),
  });

  if (shortfallUsd <= 0) {
    return {
      tapLimitUsd: tapLimitUsd.toFixed(2),
      fundedWalletBalanceUsd: payerBalanceUsd.toFixed(2),
      fundedWallet: fundingTargetWallet,
      shortfallUsd: "0.00",
      fundingSource: reasoningResult.fundingSource,
      reasoning: reasoningResult.reasoning,
      reasoningSource: reasoningResult.source,
      withdrewFromAave: false,
      transferredToFundedWallet: false,
    };
  }

  if (liquidAgentUsd + aaveWithdrawableUsd + 0.000001 < shortfallUsd) {
    throw new Error(
      `Insufficient Vincent backing for tap. Need ${shortfallUsd.toFixed(2)}, have ${(
        liquidAgentUsd + aaveWithdrawableUsd
      ).toFixed(2)}`,
    );
  }

  let withdrawalTxHash: string | undefined;
  let transferTxHash: string | undefined;

  const requiredWithdrawalUsd = Math.max(0, shortfallUsd - liquidAgentUsd);
  if (requiredWithdrawalUsd > 0.000001) {
    const withdrawResult = await executeAaveWithdraw(params.vincentContext, requiredWithdrawalUsd.toFixed(2));
    if (!withdrawResult.success || !withdrawResult.txHash) {
      throw new Error(withdrawResult.error || "Failed to withdraw from Aave");
    }
    withdrawalTxHash = withdrawResult.txHash;
    await waitForConfirmedBaseTransaction(withdrawResult.txHash);
    await waitForUsdcBalance(params.vincentContext.pkpAddress, shortfallUsd, params.decimals);
  }

  const transferResult = await executeAgentTokenTransfer(
    params.vincentContext,
    fundingTargetWallet,
    shortfallUsd.toFixed(2),
  );
  if (!transferResult.success || !transferResult.txHash) {
    throw new Error(transferResult.error || "Failed to top up payer wallet");
  }

  transferTxHash = transferResult.txHash;
  await waitForConfirmedBaseTransaction(transferResult.txHash);

  const refreshedBalance = await getWalletTokenBalance(fundingTargetWallet, TOKENS.USDC, params.decimals);
  const refreshedBalanceUsd = Number.parseFloat(refreshedBalance);

  return {
    tapLimitUsd: tapLimitUsd.toFixed(2),
    fundedWalletBalanceUsd: refreshedBalanceUsd.toFixed(2),
    fundedWallet: fundingTargetWallet,
    shortfallUsd: shortfallUsd.toFixed(2),
    fundingSource: reasoningResult.fundingSource,
    reasoning: reasoningResult.reasoning,
    reasoningSource: reasoningResult.source,
    withdrewFromAave: !!withdrawalTxHash,
    transferredToFundedWallet: true,
    withdrawalTxHash,
    transferTxHash,
  };
}

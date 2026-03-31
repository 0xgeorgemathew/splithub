import { formatUnits } from "viem";
import { TOKENS } from "~~/config/tokens";
import { createFreshBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { ERC20_ABI } from "~~/lib/contractAbis";
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
  withdrewFromAave: boolean;
  transferredToFundedWallet: boolean;
  withdrawalTxHash?: string;
  transferTxHash?: string;
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
    getWalletSnapshot(fundingTargetWallet),
  ]);

  if (paymentAmount > tapLimitUsd) {
    throw new Error(`Payment amount ${paymentAmount.toFixed(2)} exceeds tap limit ${tapLimitUsd.toFixed(2)}`);
  }

  const payerBalanceUsd = Number.parseFloat(payerBalance);
  const liquidAgentUsd = Number.parseFloat(walletSnapshot.agentLiquidUsdc);
  const aaveWithdrawableUsd = Number.parseFloat(walletSnapshot.agentAaveWithdrawableUsdc);
  const shortfallUsd = Math.max(0, paymentAmount - payerBalanceUsd);

  if (shortfallUsd <= 0) {
    return {
      tapLimitUsd: tapLimitUsd.toFixed(2),
      fundedWalletBalanceUsd: payerBalanceUsd.toFixed(2),
      fundedWallet: fundingTargetWallet,
      shortfallUsd: "0.00",
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
    const withdrawResult = await executeAaveWithdraw(requiredWithdrawalUsd.toFixed(2));
    if (!withdrawResult.success || !withdrawResult.txHash) {
      throw new Error(withdrawResult.error || "Failed to withdraw from Aave");
    }
    withdrawalTxHash = withdrawResult.txHash;
    await waitForConfirmedBaseTransaction(withdrawResult.txHash);
  }

  const transferResult = await executeAgentTokenTransfer(fundingTargetWallet, shortfallUsd.toFixed(2));
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
    withdrewFromAave: !!withdrawalTxHash,
    transferredToFundedWallet: true,
    withdrawalTxHash,
    transferTxHash,
  };
}

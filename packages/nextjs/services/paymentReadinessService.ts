import type { VincentAppUserContext } from "~~/lib/vincent";
import { getSpendSignals } from "~~/services/spendSignalService";
import { getUserByWallet, getUserTapLimit } from "~~/services/userService";
import { getWalletSnapshot } from "~~/services/vincentWalletService";

export interface PaymentReadiness {
  /** Whether Vincent can back the user's configured tap limit */
  canCoverTap: boolean;
  /** User-configured just-in-time top-up limit */
  tapLimitUsd: string;
  /** Current balance already in the chip-linked wallet */
  chipWalletBalanceUsd: string;
  /** Current liquid balance still left in the Vincent wallet */
  agentLiquidUsd: string;
  /** Amount deployed in Aave and available to withdraw */
  aaveReserveUsd: string;
  /** Exact amount that would need to be topped up for a tap right now */
  topUpRequiredUsd: string;
  /** Whether an Aave withdraw would be required right now */
  withdrawNeededNow: boolean;
  /** Historical reference point from recent SplitHub activity */
  maxRecentSpendUsd: string;
}

/**
 * Evaluate payment readiness for a user.
 * Determines whether the CHIP payment path is in a ready-to-spend state.
 */
export async function getPaymentReadiness(
  userWallet: string,
  vincentContext: Pick<VincentAppUserContext, "pkpAddress" | "agentAddress">,
): Promise<PaymentReadiness> {
  const user = await getUserByWallet(userWallet);
  const chipWallet = user?.chip_address || userWallet;

  const [snapshot, spendSignals, tapLimitUsd] = await Promise.all([
    getWalletSnapshot({
      observedWalletAddress: chipWallet,
      vincentWalletAddress: vincentContext.pkpAddress,
      agentAddress: vincentContext.agentAddress,
    }),
    getSpendSignals(userWallet),
    getUserTapLimit(userWallet),
  ]);

  const chipWalletBalance = parseFloat(snapshot.privyUsdc);
  const liquidUsdc = parseFloat(snapshot.agentLiquidUsdc);
  const aaveUsdc = parseFloat(snapshot.agentAaveWithdrawableUsdc);
  const pendingUsd = parseFloat(spendSignals.pendingRequestsUsd);
  const medianSpend = parseFloat(spendSignals.sevenDayMedianSpendUsd);
  const maxSpend = parseFloat(spendSignals.maxSingleExpectedSpendUsd);
  const maxRecentSpendUsd = Math.max(pendingUsd, medianSpend, maxSpend);
  const topUpRequired = Math.max(0, tapLimitUsd - chipWalletBalance);
  const withdrawNeededNow = topUpRequired > liquidUsdc;

  return {
    canCoverTap: chipWalletBalance + liquidUsdc + aaveUsdc >= tapLimitUsd,
    tapLimitUsd: tapLimitUsd.toFixed(2),
    chipWalletBalanceUsd: chipWalletBalance.toFixed(2),
    agentLiquidUsd: liquidUsdc.toFixed(2),
    aaveReserveUsd: aaveUsdc.toFixed(2),
    topUpRequiredUsd: topUpRequired.toFixed(2),
    withdrawNeededNow,
    maxRecentSpendUsd: maxRecentSpendUsd.toFixed(2),
  };
}

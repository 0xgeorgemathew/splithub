"use client";

import { useCallback, useState } from "react";
import { type PaymentParams } from "~~/components/settle/types";
import { ANIMATION_DELAYS } from "~~/constants/ui";
import { type FriendBalance } from "~~/lib/supabase";
import { formatAmount } from "~~/utils/format";

interface UseSettlementActionParams {
  /** Current user's wallet address */
  walletAddress: string | undefined;
  /** Callback to refresh balances after settlement */
  refreshBalances?: () => void;
}

interface UseSettlementActionReturn {
  /** Payment parameters for the settlement modal */
  params: PaymentParams | null;
  /** Currently selected friend for settlement */
  selectedFriend: FriendBalance | null;
  /** Error message if action failed */
  error: string | null;
  /** Whether the settle modal should be open */
  isSettleModalOpen: boolean;
  /** Prepare settlement for a friend (fetches token, sets params) */
  prepareSettlement: (friend: FriendBalance) => Promise<void>;
  /** Handle successful settlement (records to DB) */
  handleSuccess: (txHash: string) => Promise<void>;
  /** Reset/close the settlement flow */
  reset: () => void;
  /** Clear the error */
  clearError: () => void;
}

/**
 * Hook for managing the settlement flow.
 * Extracted from splits/page.tsx handleSettlement and handleSettlementSuccess logic.
 */
export function useSettlementAction({
  walletAddress,
  refreshBalances,
}: UseSettlementActionParams): UseSettlementActionReturn {
  const [params, setParams] = useState<PaymentParams | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<FriendBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    setIsSettleModalOpen(false);
    setSelectedFriend(null);
    setParams(null);
    setError(null);
  }, []);

  const prepareSettlement = useCallback(
    async (friend: FriendBalance) => {
      if (!walletAddress) return;

      setSelectedFriend(friend);
      setError(null);

      try {
        // Fetch token address from their expenses
        const response = await fetch(
          `/api/balances/token?userWallet=${walletAddress}&friendWallet=${friend.friend_wallet}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch token address");
        }

        const paymentParams: PaymentParams = {
          recipient: friend.friend_wallet as `0x${string}`,
          token: data.tokenAddress as `0x${string}`,
          amount: formatAmount(Math.abs(friend.net_balance)),
          memo: `Settlement with ${friend.friend_name}`,
          recipientInfo: {
            name: friend.friend_name,
            twitterHandle: friend.friend_twitter_handle ?? undefined,
            profileUrl: friend.friend_twitter_profile_url ?? undefined,
          },
        };

        setParams(paymentParams);
        setIsSettleModalOpen(true);
      } catch (err) {
        console.error("Error preparing settlement:", err);
        setError(err instanceof Error ? err.message : "Failed to prepare settlement");
      }
    },
    [walletAddress],
  );

  const handleSuccess = useCallback(
    async (txHash: string) => {
      if (!walletAddress || !selectedFriend || !params) return;

      try {
        // Record settlement in database
        const response = await fetch("/api/settlements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payerWallet: walletAddress,
            payeeWallet: selectedFriend.friend_wallet,
            amount: params.amount,
            tokenAddress: params.token,
            txHash,
          }),
        });

        if (!response.ok) {
          console.error("Failed to record settlement");
          throw new Error("Failed to record settlement");
        }

        console.log("Settlement recorded successfully");

        // Realtime will auto-update, but trigger manual refresh for immediate feedback
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAYS.SETTLEMENT_REFRESH));
        refreshBalances?.();
      } catch (err) {
        console.error("Error handling settlement success:", err);
        // Still try to refresh balances
        refreshBalances?.();
      }
    },
    [walletAddress, selectedFriend, params, refreshBalances],
  );

  return {
    params,
    selectedFriend,
    error,
    isSettleModalOpen,
    prepareSettlement,
    handleSuccess,
    reset,
    clearError,
  };
}

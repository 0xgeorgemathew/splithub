"use client";

import { useCallback, useState } from "react";
import { ANIMATION_DELAYS } from "~~/constants/ui";
import { type FriendBalance, type PaymentRequest } from "~~/lib/supabase";
import { formatAmount } from "~~/utils/format";

interface UsePaymentRequestActionParams {
  /** Current user's wallet address */
  walletAddress: string | undefined;
  /** Current user's Twitter username */
  userTwitter: string | undefined;
  /** Pending payment requests to check for existing requests */
  pendingRequests: PaymentRequest[];
  /** Callback to refresh payment requests */
  refreshRequests?: () => void;
}

interface UsePaymentRequestActionReturn {
  /** Wallet address currently being processed */
  processingWallet: string | null;
  /** Wallet address that just succeeded (for animation) */
  successWallet: string | null;
  /** Error message if action failed */
  error: string | null;
  /** Create a new request or send a reminder for existing one */
  createOrRemindRequest: (friend: FriendBalance) => Promise<void>;
  /** Clear the error */
  clearError: () => void;
}

/**
 * Hook for managing payment request creation and reminder sending.
 * Extracted from splits/page.tsx handlePaymentRequestClick logic.
 */
export function usePaymentRequestAction({
  walletAddress,
  userTwitter,
  pendingRequests,
  refreshRequests,
}: UsePaymentRequestActionParams): UsePaymentRequestActionReturn {
  const [processingWallet, setProcessingWallet] = useState<string | null>(null);
  const [successWallet, setSuccessWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Helper to get pending request for a friend
  const getRequestForFriend = useCallback(
    (friendWallet: string): PaymentRequest | null => {
      return pendingRequests.find(req => req.payer.toLowerCase() === friendWallet.toLowerCase()) || null;
    },
    [pendingRequests],
  );

  const createOrRemindRequest = useCallback(
    async (friend: FriendBalance) => {
      if (!walletAddress || processingWallet) return;

      const existingRequest = getRequestForFriend(friend.friend_wallet);

      setProcessingWallet(friend.friend_wallet);
      setError(null);

      try {
        if (existingRequest) {
          // Send reminder for existing request
          const reminderResponse = await fetch(`/api/payment-requests/${existingRequest.id}/remind`, {
            method: "POST",
          });

          const reminderData = await reminderResponse.json();

          if (!reminderResponse.ok) {
            throw new Error(reminderData.error || "Failed to send reminder");
          }
        } else {
          // Create new payment request
          const tokenResponse = await fetch(
            `/api/balances/token?userWallet=${walletAddress}&friendWallet=${friend.friend_wallet}`,
          );
          const tokenData = await tokenResponse.json();

          if (!tokenResponse.ok) {
            throw new Error(tokenData.error || "Failed to fetch token address");
          }

          const requestResponse = await fetch("/api/payment-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payer: friend.friend_wallet,
              recipient: walletAddress,
              token: tokenData.tokenAddress,
              amount: formatAmount(friend.net_balance),
              memo: `Settlement request from ${userTwitter || "you"}`,
              payerTwitter: friend.friend_twitter_handle,
              requesterTwitter: userTwitter,
            }),
          });

          const requestData = await requestResponse.json();

          if (!requestResponse.ok) {
            throw new Error(requestData.error || "Failed to create request");
          }

          // Fire-and-forget refresh, realtime handles the actual update
          refreshRequests?.();
        }

        // Show success animation
        setProcessingWallet(null);
        setSuccessWallet(friend.friend_wallet);

        setTimeout(() => {
          setSuccessWallet(null);
        }, ANIMATION_DELAYS.SUCCESS_DISPLAY);
      } catch (err) {
        console.error("Error with payment request:", err);
        setError(err instanceof Error ? err.message : "Failed to process request");
        setProcessingWallet(null);
      }
    },
    [walletAddress, userTwitter, processingWallet, getRequestForFriend, refreshRequests],
  );

  return {
    processingWallet,
    successWallet,
    error,
    createOrRemindRequest,
    clearError,
  };
}

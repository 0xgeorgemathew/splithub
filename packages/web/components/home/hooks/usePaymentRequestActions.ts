import { useCallback, useEffect, useRef, useState } from "react";
import { type FriendBalance } from "~~/lib/supabase";
import { formatPaymentRequestError } from "~~/utils/errorFormatting";

/** Duration to show success checkmark before clearing (ms) */
const SUCCESS_ANIMATION_DURATION_MS = 1500;

interface PaymentRequestActionsState {
  /** Whether a payment request action is in progress */
  isProcessing: boolean;
  /** Wallet address of the friend currently being processed */
  processingFriendWallet: string | null;
  /** Wallet address of friend with recent successful action */
  successFriendWallet: string | null;
  /** Error message from failed action */
  error: string | null;
}

interface PaymentRequestActionsResult extends PaymentRequestActionsState {
  /**
   * Handle payment request action for a friend
   * Creates new request if none exists, sends reminder otherwise
   */
  handlePaymentRequest: (
    friend: FriendBalance,
    existingRequestId: string | null,
    walletAddress: string,
    twitterUsername: string | undefined,
  ) => Promise<void>;
  /** Clear error state */
  clearError: () => void;
  /** Check if a specific friend is being processed */
  isProcessingFriend: (friendWallet: string) => boolean;
  /** Check if a specific friend just succeeded */
  isSuccessFriend: (friendWallet: string) => boolean;
}

/**
 * Hook for managing payment request actions (create/remind)
 *
 * Extracted from FriendBalancesList to isolate business logic
 * and make it testable independently.
 */
export function usePaymentRequestActions(refreshRequests: () => void): PaymentRequestActionsResult {
  const [state, setState] = useState<PaymentRequestActionsState>({
    isProcessing: false,
    processingFriendWallet: null,
    successFriendWallet: null,
    error: null,
  });

  // Use ref for isProcessing to avoid stale closure in handlePaymentRequest
  const isProcessingRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
    isProcessingRef.current = state.isProcessing;
  }, [state.isProcessing]);

  // Clear success state after animation duration (with cleanup)
  useEffect(() => {
    if (!state.successFriendWallet) return;

    const timer = setTimeout(() => {
      setState(prev => ({
        ...prev,
        successFriendWallet: null,
      }));
    }, SUCCESS_ANIMATION_DURATION_MS);

    return () => clearTimeout(timer);
  }, [state.successFriendWallet]);

  const handlePaymentRequest = useCallback(
    async (
      friend: FriendBalance,
      existingRequestId: string | null,
      walletAddress: string,
      twitterUsername: string | undefined,
    ) => {
      // Use ref to check processing state (avoids stale closure)
      if (isProcessingRef.current) return;

      setState(prev => ({
        ...prev,
        processingFriendWallet: friend.friend_wallet,
        isProcessing: true,
        error: null,
      }));

      try {
        if (existingRequestId) {
          // Send reminder for existing request
          let reminderResponse: Response;
          try {
            reminderResponse = await fetch(`/api/payment-requests/${existingRequestId}/remind`, {
              method: "POST",
            });
          } catch (_networkError) {
            throw new Error("Network error. Please check your connection and try again.");
          }

          const reminderData = await reminderResponse.json();

          if (!reminderResponse.ok) {
            throw new Error(reminderData.error || "Failed to send reminder");
          }
        } else {
          // Create new payment request - fetch token address first
          let tokenResponse: Response;
          try {
            tokenResponse = await fetch(
              `/api/balances/token?userWallet=${walletAddress}&friendWallet=${friend.friend_wallet}`,
            );
          } catch (_networkError) {
            throw new Error("Network error. Please check your connection and try again.");
          }

          const tokenData = await tokenResponse.json();

          if (!tokenResponse.ok) {
            throw new Error(tokenData.error || "Failed to fetch token address");
          }

          // Create the payment request
          let requestResponse: Response;
          try {
            requestResponse = await fetch("/api/payment-requests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                payer: friend.friend_wallet,
                recipient: walletAddress,
                token: tokenData.tokenAddress,
                amount: Math.abs(friend.net_balance).toFixed(2),
                memo: `Settlement request from ${twitterUsername || "you"}`,
                payerTwitter: friend.friend_twitter_handle,
                requesterTwitter: twitterUsername,
              }),
            });
          } catch (_networkError) {
            throw new Error("Network error. Please check your connection and try again.");
          }

          const requestData = await requestResponse.json();

          if (!requestResponse.ok) {
            throw new Error(requestData.error || "Failed to create request");
          }

          // Refresh requests with error handling
          try {
            refreshRequests();
          } catch (refreshError) {
            console.warn("Failed to refresh requests, relying on realtime", refreshError);
          }
        }

        // Show success animation (useEffect handles cleanup)
        setState(prev => ({
          ...prev,
          isProcessing: false,
          processingFriendWallet: null,
          successFriendWallet: friend.friend_wallet,
        }));
      } catch (err) {
        console.error("Error with payment request:", err);
        setState(prev => ({
          ...prev,
          error: formatPaymentRequestError(err),
          isProcessing: false,
          processingFriendWallet: null,
        }));
      }
    },
    [refreshRequests],
  );

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const isProcessingFriend = useCallback(
    (friendWallet: string) => {
      return state.isProcessing && state.processingFriendWallet === friendWallet;
    },
    [state.isProcessing, state.processingFriendWallet],
  );

  const isSuccessFriend = useCallback(
    (friendWallet: string) => {
      return state.successFriendWallet === friendWallet;
    },
    [state.successFriendWallet],
  );

  return {
    ...state,
    handlePaymentRequest,
    clearError,
    isProcessingFriend,
    isSuccessFriend,
  };
}

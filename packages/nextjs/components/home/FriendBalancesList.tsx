"use client";

import { useState } from "react";
import { BalanceItem } from "./BalanceItem";
import { WalletBalanceCard } from "./WalletBalanceCard";
import { usePaymentRequestActions } from "./hooks/usePaymentRequestActions";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, TrendingUp, Wallet } from "lucide-react";
import { ErrorDisplay, LoadingSpinner } from "~~/components/common/LoadingStates";
import { ExpenseModal } from "~~/components/expense/ExpenseModal";
import { SettleModal } from "~~/components/settle/SettleModal";
import { type PaymentParams } from "~~/components/settle/types";
import { useFriendBalancesRealtime } from "~~/hooks/useFriendBalancesRealtime";
import { usePaymentRequestsRealtime } from "~~/hooks/usePaymentRequestsRealtime";
import { useUSDCBalance } from "~~/hooks/useUSDCBalance";
import { useWalletAddress } from "~~/hooks/useWalletAddress";
import { type FriendBalance } from "~~/lib/supabase";
import { formatCurrencyAmount } from "~~/utils/formatting";

/**
 * Friend Balances List - Main dashboard component
 *
 * Displays:
 * - Wallet balance card with USDC balance and overall friend balance
 * - List of friends with their balances
 * - Actions: Add expense, settle debt, send payment request
 *
 * Uses realtime subscriptions for live updates.
 */
export const FriendBalancesList = () => {
  const { user } = usePrivy();
  const { walletAddress } = useWalletAddress();
  const { balances, overallBalance, loading, error, refresh: refreshBalances } = useFriendBalancesRealtime();
  const { requests: outgoingRequests, refresh: refreshRequests } = usePaymentRequestsRealtime("outgoing");

  // Modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendBalance | null>(null);
  const [settlementParams, setSettlementParams] = useState<PaymentParams | null>(null);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  // Payment request actions hook
  const {
    isProcessing: isProcessingRequest,
    error: requestError,
    handlePaymentRequest,
    isProcessingFriend,
    isSuccessFriend,
  } = usePaymentRequestActions(refreshRequests);

  const { formattedBalance: walletBalance, isLoading: isWalletBalanceLoading } = useUSDCBalance();

  // Get pending requests only
  const pendingRequests = outgoingRequests.filter(req => req.status === "pending");

  // Helper to get pending request for a friend
  const getRequestForFriend = (friendWallet: string) => {
    return pendingRequests.find(req => req.payer.toLowerCase() === friendWallet.toLowerCase()) || null;
  };

  // Row click triggers settlement when you owe them
  const handleFriendClick = async (friend: FriendBalance) => {
    if (!walletAddress || friend.net_balance >= 0) return;
    await handleSettlement(friend);
  };

  // Payment request icon click - creates request or sends reminder
  const handlePaymentRequestClick = async (friend: FriendBalance, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!walletAddress || isProcessingRequest) return;

    const existingRequest = getRequestForFriend(friend.friend_wallet);
    setSelectedFriend(friend);

    await handlePaymentRequest(
      friend,
      existingRequest?.id || null,
      walletAddress,
      user?.twitter?.username ?? undefined,
    );
  };

  const handleSettlement = async (friend: FriendBalance) => {
    if (!walletAddress) return;

    setSelectedFriend(friend);

    try {
      const response = await fetch(
        `/api/balances/token?userWallet=${walletAddress}&friendWallet=${friend.friend_wallet}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch token address");
      }

      const params: PaymentParams = {
        recipient: friend.friend_wallet as `0x${string}`,
        token: data.tokenAddress as `0x${string}`,
        amount: formatCurrencyAmount(friend.net_balance),
        memo: `Settlement with ${friend.friend_name}`,
        recipientInfo: {
          name: friend.friend_name,
          twitterHandle: friend.friend_twitter_handle ?? undefined,
          profileUrl: friend.friend_twitter_profile_url ?? undefined,
        },
      };

      setSettlementParams(params);
      setIsSettleModalOpen(true);
    } catch (err) {
      console.error("Error preparing settlement:", err);
      setSettlementError(err instanceof Error ? err.message : "Failed to prepare settlement");
    }
  };

  const handleSettlementSuccess = async (txHash: string) => {
    if (!walletAddress || !selectedFriend || !settlementParams) return;

    try {
      const response = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerWallet: walletAddress,
          payeeWallet: selectedFriend.friend_wallet,
          amount: settlementParams.amount,
          tokenAddress: settlementParams.token,
          txHash,
        }),
      });

      if (!response.ok) {
        console.error("Failed to record settlement");
        throw new Error("Failed to record settlement");
      }

      // Realtime will auto-update, but trigger manual refresh for immediate feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      refreshBalances();
    } catch (err) {
      console.error("Error handling settlement success:", err);
      refreshBalances();
    }
  };

  const handleCloseModal = () => {
    setIsSettleModalOpen(false);
    setSelectedFriend(null);
    setSettlementParams(null);
  };

  // Loading state
  if (loading) {
    return <LoadingSpinner message="Loading your balances..." />;
  }

  // Error state
  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />;
  }

  const actionError = requestError || settlementError;

  return (
    <div>
      {/* Hero Wallet Balance Card */}
      <WalletBalanceCard
        walletBalance={walletBalance}
        overallBalance={overallBalance}
        isLoading={isWalletBalanceLoading}
      />

      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">Ledger</span>
          <span className="text-xs text-base-content/50 bg-base-300/50 px-2 py-0.5 rounded-full">
            {balances.length}
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsExpenseModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-warning/10 hover:bg-warning/20 text-warning rounded-full text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Expense
        </motion.button>
      </div>

      {/* Friend List or Empty State */}
      <AnimatePresence mode="wait">
        {balances.length === 0 ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center py-16 px-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-5"
            >
              <TrendingUp className="w-10 h-10 text-primary/40" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-base-content/70 font-semibold text-lg"
            >
              No balances yet
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-base-content/40 mt-2 max-w-xs mx-auto"
            >
              Add an expense to start tracking who owes what
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="balance-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-0"
          >
            {balances.map((balance, index) => (
              <BalanceItem
                key={balance.friend_wallet}
                balance={balance}
                index={index}
                isLast={index === balances.length - 1}
                isProcessing={isProcessingFriend(balance.friend_wallet)}
                isSuccess={isSuccessFriend(balance.friend_wallet)}
                hasPendingRequest={!!getRequestForFriend(balance.friend_wallet)}
                onRowClick={handleFriendClick}
                onRequestClick={handlePaymentRequestClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => {
          refreshBalances();
          refreshRequests();
        }}
      />

      {/* Settlement Modal */}
      {settlementParams && (
        <SettleModal
          isOpen={isSettleModalOpen}
          onClose={handleCloseModal}
          params={settlementParams}
          onSuccess={handleSettlementSuccess}
        />
      )}

      {/* Error Toast */}
      {actionError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-error text-error-content px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium text-sm">{actionError}</span>
          </div>
        </div>
      )}
    </div>
  );
};

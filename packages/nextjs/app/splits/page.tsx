"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { Sparkles, Wallet } from "lucide-react";
import { ExpenseModal } from "~~/components/expense/ExpenseModal";
import { CircleSection } from "~~/components/home/CircleSection";
import { SettleModal } from "~~/components/settle/SettleModal";
import { type PaymentParams } from "~~/components/settle/types";
import { BalancesLiveFeed } from "~~/components/splits/BalancesLiveFeed";
import { SplitsHero } from "~~/components/splits/SplitsHero";
import { useFriendBalancesRealtime } from "~~/hooks/useFriendBalancesRealtime";
import { usePaymentRequestsRealtime } from "~~/hooks/usePaymentRequestsRealtime";
import { useUSDCBalance } from "~~/hooks/useUSDCBalance";
import { type FriendBalance } from "~~/lib/supabase";

export default function SplitsPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const { balances, overallBalance, loading, error, refresh: refreshBalances } = useFriendBalancesRealtime();
  const { formattedBalance: walletBalance, isLoading: isWalletBalanceLoading } = useUSDCBalance();
  // Use realtime hook for payment requests - updates automatically when DB changes
  const { requests: outgoingRequests, refresh: refreshRequests } = usePaymentRequestsRealtime("outgoing");

  // Modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendBalance | null>(null);
  const [settlementParams, setSettlementParams] = useState<PaymentParams | null>(null);
  const [processingFriendWallet, setProcessingFriendWallet] = useState<string | null>(null);
  const [successFriendWallet, setSuccessFriendWallet] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const walletAddress = user?.wallet?.address;

  // Get pending requests only - filtered from realtime data
  const pendingRequests = outgoingRequests.filter(req => req.status === "pending");

  // Helper to get pending request for a friend (simplified - just checks if any request exists)
  const getRequestForFriend = (friendWallet: string) => {
    return pendingRequests.find(req => req.payer.toLowerCase() === friendWallet.toLowerCase()) || null;
  };

  const formatAmount = (amount: number): string => {
    return Math.abs(amount).toFixed(2);
  };

  const canSettle = (balance: number): boolean => {
    return balance < 0;
  };

  const _canRequestPayment = (balance: number): boolean => {
    return balance > 0;
  };

  const handleFriendClick = async (friend: FriendBalance) => {
    if (!walletAddress) return;

    // Only handle settlement when clicking on the row (you owe them)
    if (canSettle(friend.net_balance)) {
      await handleSettlement(friend);
      return;
    }

    // For positive balances (they owe you), do nothing on row click
    // The payment request is triggered via the icon
  };

  // Handle payment request icon click - creates request or sends reminder
  const handlePaymentRequestClick = async (friend: FriendBalance) => {
    if (!walletAddress || processingFriendWallet) return;

    const existingRequest = getRequestForFriend(friend.friend_wallet);

    setSelectedFriend(friend);
    setProcessingFriendWallet(friend.friend_wallet);
    setActionError(null);

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

        // Show success checkmark animation
        setProcessingFriendWallet(null);
        setSuccessFriendWallet(friend.friend_wallet);
        setTimeout(() => {
          setSuccessFriendWallet(null);
          setSelectedFriend(null);
        }, 1500);
        return;
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
            memo: `Settlement request from ${user?.twitter?.username || "you"}`,
            payerTwitter: friend.friend_twitter_handle,
            requesterTwitter: user?.twitter?.username,
          }),
        });

        const requestData = await requestResponse.json();

        if (!requestResponse.ok) {
          throw new Error(requestData.error || "Failed to create request");
        }

        // Show success animation - realtime subscription will update pendingRequests
        setProcessingFriendWallet(null);
        setSuccessFriendWallet(friend.friend_wallet);
        refreshRequests(); // Fire-and-forget, realtime handles the actual update

        setTimeout(() => {
          setSuccessFriendWallet(null);
          setSelectedFriend(null);
        }, 1500);
        return;
      }
    } catch (err) {
      console.error("Error with payment request:", err);
      setActionError(err instanceof Error ? err.message : "Failed to process request");
      setProcessingFriendWallet(null);
    }
  };

  const handleSettlement = async (friend: FriendBalance) => {
    if (!walletAddress) return;

    setSelectedFriend(friend);

    try {
      // Fetch token address from their expenses
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
        amount: formatAmount(Math.abs(friend.net_balance)),
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
      setActionError(err instanceof Error ? err.message : "Failed to prepare settlement");
    }
  };

  const handleSettlementSuccess = async (txHash: string) => {
    if (!walletAddress || !selectedFriend || !settlementParams) return;

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
          amount: settlementParams.amount,
          tokenAddress: settlementParams.token,
          txHash,
        }),
      });

      if (!response.ok) {
        console.error("Failed to record settlement");
        throw new Error("Failed to record settlement");
      }

      console.log("Settlement recorded successfully");

      // Realtime will auto-update, but trigger manual refresh for immediate feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      refreshBalances();
    } catch (err) {
      console.error("Error handling settlement success:", err);
      // Still try to refresh balances
      refreshBalances();
    }
  };

  const handleCloseModal = () => {
    setIsSettleModalOpen(false);
    setSelectedFriend(null);
    setSettlementParams(null);
  };

  // Loading state - Privy not ready
  if (!ready) {
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary/50" />
          </div>
        </motion.div>
      </div>
    );
  }

  // Not authenticated - show login prompt
  if (!authenticated || !user?.wallet?.address) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-[calc(100vh-160px)] flex items-center justify-center p-4"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-5"
          >
            <Wallet className="w-10 h-10 text-primary/50" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-base-content/60 text-lg mb-5 font-medium"
          >
            Connect your wallet to view splits
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={login}
            className="px-6 py-3 bg-primary text-primary-content font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
          >
            Login with Twitter
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Loading state - fetching data
  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary/50" />
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-base-content/50 text-sm mt-4 font-medium"
          >
            Loading your splits...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 px-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center mb-4"
          >
            <svg className="w-7 h-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </motion.div>
          <p className="text-error text-sm font-medium mb-4">{error}</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => refreshBalances()}
            className="px-5 py-2.5 bg-primary text-primary-content rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Try Again
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 pb-24">
      {/* Hero Card */}
      <SplitsHero
        walletBalance={walletBalance}
        overallBalance={overallBalance}
        isWalletLoading={isWalletBalanceLoading}
        friendCount={balances.length}
        onAddExpense={() => setIsExpenseModalOpen(true)}
      />

      {/* Circles Section */}
      <CircleSection />

      {/* Balances Live Feed */}
      <BalancesLiveFeed
        balances={balances}
        loading={false}
        onFriendClick={handleFriendClick}
        onAddExpense={() => setIsExpenseModalOpen(true)}
        pendingRequests={pendingRequests}
        onPaymentRequestClick={handlePaymentRequestClick}
        processingFriendWallet={processingFriendWallet}
        successFriendWallet={successFriendWallet}
      />

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => {
          refreshBalances();
          refreshRequests(); // Refresh to show updated icons (stale requests are deleted)
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
}

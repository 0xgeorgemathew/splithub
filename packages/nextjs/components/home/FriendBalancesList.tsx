"use client";

import { useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BanknoteArrowDown,
  Bell,
  Check,
  Nfc,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { ExpenseModal } from "~~/components/expense/ExpenseModal";
import { SettleModal } from "~~/components/settle/SettleModal";
import { type PaymentParams } from "~~/components/settle/types";
import { useFriendBalancesRealtime } from "~~/hooks/useFriendBalancesRealtime";
import { usePaymentRequestsRealtime } from "~~/hooks/usePaymentRequestsRealtime";
import { useUSDCBalance } from "~~/hooks/useUSDCBalance";
import { type FriendBalance } from "~~/lib/supabase";

// Icon animation variants for smooth transitions
const iconVariants = {
  initial: { scale: 0, opacity: 0, rotate: -180 },
  animate: { scale: 1, opacity: 1, rotate: 0 },
  exit: { scale: 0, opacity: 0, rotate: 180 },
};

// Animated icon component for payment request state transitions
const AnimatedRequestIcon = ({
  isProcessing,
  isSuccess,
  hasValidRequest,
}: {
  isProcessing: boolean;
  isSuccess: boolean;
  hasValidRequest: boolean;
}) => {
  // Determine which icon to show based on state
  // Flow: Banknote → Loading → Check → Bell (new request)
  // Flow: Bell → Loading → Check → Bell (reminder)
  const getIconKey = () => {
    if (isProcessing) return "loading";
    if (isSuccess) return "check";
    if (hasValidRequest) return "bell";
    return "banknote";
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={getIconKey()}
        variants={iconVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex items-center justify-center"
      >
        {isProcessing ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Bell className="w-5 h-5 text-[#00E0B8]" />
          </motion.div>
        ) : isSuccess ? (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.3 }}>
            <Check className="w-5 h-5 text-[#00E0B8]" />
          </motion.div>
        ) : hasValidRequest ? (
          <Bell className="w-5 h-5 text-[#00E0B8]" />
        ) : (
          <BanknoteArrowDown className="w-5 h-5 text-[#00E0B8]/70" />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export const FriendBalancesList = () => {
  const { user } = usePrivy();
  const { balances, overallBalance, loading, error, refresh: refreshBalances } = useFriendBalancesRealtime();
  // Use realtime hook for payment requests - updates automatically when DB changes
  const { requests: outgoingRequests, refresh: refreshRequests } = usePaymentRequestsRealtime("outgoing");

  // Modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendBalance | null>(null);
  const [settlementParams, setSettlementParams] = useState<PaymentParams | null>(null);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const [processingFriendWallet, setProcessingFriendWallet] = useState<string | null>(null);
  const [successFriendWallet, setSuccessFriendWallet] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const walletAddress = user?.wallet?.address;

  // Fetch actual USDC wallet balance
  const { formattedBalance: walletBalance, isLoading: isWalletBalanceLoading } = useUSDCBalance();

  // Get pending requests only - filtered from realtime data
  const pendingRequests = outgoingRequests.filter(req => req.status === "pending");

  // Helper to get pending request for a friend (simplified - just checks if any request exists)
  const getRequestForFriend = (friendWallet: string) => {
    return pendingRequests.find(req => req.payer.toLowerCase() === friendWallet.toLowerCase()) || null;
  };

  // Simple check if friend has any pending request
  const hasRequestForFriend = (friendWallet: string): boolean => {
    return pendingRequests.some(req => req.payer.toLowerCase() === friendWallet.toLowerCase());
  };

  const formatAmount = (amount: number): string => {
    return Math.abs(amount).toFixed(2);
  };

  const getBalanceText = (balance: number): string => {
    if (balance > 0) return "owes you";
    if (balance < 0) return "you owe";
    return "settled up";
  };

  // Row click only triggers settlement (when you owe them)
  const handleFriendClick = async (friend: FriendBalance) => {
    if (!walletAddress || friend.net_balance >= 0) return;
    await handleSettlement(friend);
  };

  // Handle payment request icon click - creates request or sends reminder
  const handlePaymentRequestClick = async (friend: FriendBalance, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger row click
    if (!walletAddress || isProcessingRequest) return;

    const existingRequest = getRequestForFriend(friend.friend_wallet);

    setSelectedFriend(friend);
    setProcessingFriendWallet(friend.friend_wallet);
    setIsProcessingRequest(true);
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
        setIsProcessingRequest(false);
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
        setIsProcessingRequest(false);
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
      setIsProcessingRequest(false);
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
          payerWallet: walletAddress, // Current user is paying
          payeeWallet: selectedFriend.friend_wallet, // Friend is receiving
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

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary/50" />
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base-content/50 text-sm mt-4 font-medium"
        >
          Loading your balances...
        </motion.p>
      </motion.div>
    );
  }

  if (error) {
    return (
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
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-primary text-primary-content rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          Try Again
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Hero Wallet Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 rounded-3xl p-6 relative overflow-hidden border border-white/[0.05]"
        style={{
          background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
          boxShadow: "0 4px 20px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        {/* Subtle mesh gradient overlay */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(at 20% 30%, rgba(242, 169, 0, 0.12) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(242, 169, 0, 0.08) 0%, transparent 50%)",
          }}
        />

        <div className="relative">
          {/* Label */}
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-warning" />
            <span className="text-xs font-bold text-warning uppercase tracking-wider">Wallet Balance</span>
          </div>

          {/* Main Balance */}
          <div className="mb-4">
            {isWalletBalanceLoading ? (
              <span className="inline-block w-40 h-12 bg-base-300/50 rounded-xl animate-pulse" />
            ) : (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="text-5xl font-bold text-white tracking-tight font-mono"
              >
                ${walletBalance.toFixed(2)}
              </motion.span>
            )}
          </div>

          {/* Friends Balance Badge */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`inline-flex items-center gap-2 ${overallBalance === 0 ? "opacity-60" : ""}`}
          >
            {overallBalance > 0 ? (
              <ArrowDownRight className="w-4 h-4 text-[#00E0B8]" />
            ) : overallBalance < 0 ? (
              <ArrowUpRight className="w-4 h-4 text-rose-500" />
            ) : (
              <TrendingUp className="w-4 h-4 text-base-content/50" />
            )}
            <span
              className={`text-sm font-medium ${
                overallBalance > 0 ? "text-[#00E0B8]" : overallBalance < 0 ? "text-rose-500" : "text-base-content/50"
              }`}
            >
              {overallBalance > 0
                ? `Friends owe you $${formatAmount(overallBalance)}`
                : overallBalance < 0
                  ? `You owe $${formatAmount(overallBalance)}`
                  : "All settled up"}
            </span>
          </motion.div>
        </div>
      </motion.div>

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

      {/* Friend List Tiles or Empty State */}
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
            {balances.map((balance, index) => {
              const isPositive = balance.net_balance > 0;
              const isNegative = balance.net_balance < 0;
              const isLast = index === balances.length - 1;

              // Icon state for positive balances (they owe you)
              const isProcessing = isProcessingRequest && processingFriendWallet === balance.friend_wallet;
              const isSuccess = successFriendWallet === balance.friend_wallet;
              const hasPendingRequest = hasRequestForFriend(balance.friend_wallet);

              return (
                <motion.div
                  key={balance.friend_wallet}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileTap={isNegative ? { scale: 0.98 } : {}}
                  className={`group flex items-center px-4 py-5 transition-colors ${
                    isNegative ? "cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.04]" : "cursor-default"
                  } ${!isLast ? "border-b border-white/5" : ""}`}
                  onClick={() => isNegative && handleFriendClick(balance)}
                >
                  {/* Left: Avatar + Name */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {balance.friend_twitter_profile_url ? (
                      <Image
                        src={balance.friend_twitter_profile_url}
                        alt={balance.friend_twitter_handle || balance.friend_name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#2a2a2a] border border-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-white/80">
                          {balance.friend_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-white truncate">{balance.friend_name}</span>
                      <span className={`text-xs ${isPositive ? "text-[#00E0B8]/70" : "text-rose-500/70"}`}>
                        {getBalanceText(balance.net_balance)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Amount + Icon - CSS Grid enforces exact column widths */}
                  <div className="grid grid-cols-[100px_40px] gap-2 items-center flex-shrink-0">
                    <div
                      className={`font-mono text-lg font-bold tabular-nums text-right ${
                        isPositive ? "text-[#00E0B8]" : "text-rose-500"
                      }`}
                    >
                      ${formatAmount(balance.net_balance)}
                    </div>

                    <div
                      role={isPositive ? "button" : undefined}
                      tabIndex={isPositive ? 0 : undefined}
                      onClick={
                        isPositive
                          ? e => {
                              e.stopPropagation();
                              handlePaymentRequestClick(balance, e);
                            }
                          : undefined
                      }
                      className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                        isPositive && !isProcessing && !isSuccess ? "cursor-pointer hover:bg-[#00E0B8]/10" : ""
                      }`}
                      title={isPositive ? (hasPendingRequest ? "Send reminder" : "Send payment request") : undefined}
                    >
                      {isNegative && <Nfc className="w-5 h-5 text-rose-500/70" />}
                      {isPositive && (
                        <AnimatedRequestIcon
                          isProcessing={isProcessing}
                          isSuccess={isSuccess}
                          hasValidRequest={hasPendingRequest}
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

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
};

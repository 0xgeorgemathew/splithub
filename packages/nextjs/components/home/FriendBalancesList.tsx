"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Bell, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { SettleModal } from "~~/components/settle/SettleModal";
import { type PaymentParams } from "~~/components/settle/types";
import { useUSDCBalance } from "~~/hooks/useUSDCBalance";
import { type FriendBalance } from "~~/lib/supabase";
import { getFriendBalances, getOverallBalance } from "~~/services/balanceService";

export const FriendBalancesList = () => {
  const { user } = usePrivy();
  const [balances, setBalances] = useState<FriendBalance[]>([]);
  const [overallBalance, setOverallBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settlement modal state
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendBalance | null>(null);
  const [settlementParams, setSettlementParams] = useState<PaymentParams | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const walletAddress = user?.wallet?.address;

  // Fetch actual USDC wallet balance
  const { formattedBalance: walletBalance, isLoading: isWalletBalanceLoading } = useUSDCBalance();

  useEffect(() => {
    const fetchBalances = async () => {
      if (!walletAddress) return;

      setLoading(true);
      setError(null);

      try {
        const [friendBalances, overall] = await Promise.all([
          getFriendBalances(walletAddress),
          getOverallBalance(walletAddress),
        ]);

        setBalances(friendBalances);
        setOverallBalance(overall);
      } catch (err) {
        console.error("Error fetching balances:", err);
        setError(err instanceof Error ? err.message : "Failed to load balances");
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();

    // Listen for refresh events (e.g., when a payment request is completed)
    const handleRefresh = () => {
      console.log("Balance refresh event received, reloading balances...");
      fetchBalances();
    };
    window.addEventListener("refreshBalances", handleRefresh);

    return () => {
      window.removeEventListener("refreshBalances", handleRefresh);
    };
  }, [walletAddress]);

  const formatAmount = (amount: number): string => {
    return Math.abs(amount).toFixed(2);
  };

  const getBalanceText = (balance: number): string => {
    if (balance > 0) return "owes you";
    if (balance < 0) return "you owe";
    return "settled up";
  };

  const canSettle = (balance: number): boolean => {
    // Can only settle if you owe them (negative balance)
    return balance < 0;
  };

  const canRequestPayment = (balance: number): boolean => {
    // Can request payment if they owe you (positive balance)
    return balance > 0;
  };

  const handleFriendClick = async (friend: FriendBalance) => {
    if (!walletAddress) return;

    // Case 1: They owe you - create a payment request
    if (canRequestPayment(friend.net_balance)) {
      await handleCreateRequest(friend);
      return;
    }

    // Case 2: You owe them - open settlement modal
    if (canSettle(friend.net_balance)) {
      await handleSettlement(friend);
      return;
    }
  };

  const handleCreateRequest = async (friend: FriendBalance) => {
    if (!walletAddress || isCreatingRequest) return;

    setSelectedFriend(friend);
    setIsCreatingRequest(true);
    setError(null);

    try {
      // Fetch token address from their expenses
      const tokenResponse = await fetch(
        `/api/balances/token?userWallet=${walletAddress}&friendWallet=${friend.friend_wallet}`,
      );
      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokenData.error || "Failed to fetch token address");
      }

      // Create payment request
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

      // Show success state in modal
      setRequestSuccess(true);

      // Show success message for existing requests
      if (requestData.isExisting) {
        setSuccessMessage(`A payment request for ${friend.friend_name} already exists and is still pending.`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }

      // Auto-close after showing success
      setTimeout(() => {
        setIsCreatingRequest(false);
        setRequestSuccess(false);
        setSelectedFriend(null);
      }, 2000);
    } catch (err) {
      console.error("Error creating request:", err);
      setError(err instanceof Error ? err.message : "Failed to create payment request");
      setIsCreatingRequest(false);
      setRequestSuccess(false);
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
        recipient: friend.friend_wallet as `0x${string}`, // Friend receives payment
        token: data.tokenAddress as `0x${string}`,
        amount: formatAmount(Math.abs(friend.net_balance)), // Use absolute value since balance is negative
        memo: `Settlement with ${friend.friend_name}`,
      };

      setSettlementParams(params);
      setIsSettleModalOpen(true);
    } catch (err) {
      console.error("Error preparing settlement:", err);
      setError(err instanceof Error ? err.message : "Failed to prepare settlement");
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

      console.log("Settlement recorded successfully, refreshing balances...");

      // Trigger global balance refresh event
      window.dispatchEvent(new Event("refreshBalances"));

      // Small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh balances to show updated amounts
      const [friendBalances, overall] = await Promise.all([
        getFriendBalances(walletAddress),
        getOverallBalance(walletAddress),
      ]);

      setBalances(friendBalances);
      setOverallBalance(overall);

      console.log("Balances refreshed:", { friendBalances, overall });
    } catch (err) {
      console.error("Error handling settlement success:", err);
      // Still refresh balances even if there's an error
      try {
        const [friendBalances, overall] = await Promise.all([
          getFriendBalances(walletAddress),
          getOverallBalance(walletAddress),
        ]);
        setBalances(friendBalances);
        setOverallBalance(overall);
      } catch (refreshErr) {
        console.error("Failed to refresh balances:", refreshErr);
      }
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

  if (balances.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
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
          Tap &quot;Add Expense&quot; below to start splitting with friends
        </motion.p>
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
        className="mb-4 rounded-3xl p-6 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(242, 169, 0, 0.08) 0%, rgba(242, 169, 0, 0.02) 50%, transparent 100%)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Subtle mesh gradient overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(at 20% 30%, rgba(242, 169, 0, 0.15) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(242, 169, 0, 0.1) 0%, transparent 50%)",
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
                className="text-5xl font-bold text-white font-mono tracking-tight"
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
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
              overallBalance > 0 ? "bg-emerald-500/15" : overallBalance < 0 ? "bg-rose-500/15" : "bg-base-300/50"
            }`}
          >
            {overallBalance > 0 ? (
              <ArrowDownRight className="w-4 h-4 text-emerald-500" />
            ) : overallBalance < 0 ? (
              <ArrowUpRight className="w-4 h-4 text-rose-500" />
            ) : (
              <TrendingUp className="w-4 h-4 text-base-content/60" />
            )}
            <span
              className={`text-sm font-semibold ${
                overallBalance > 0 ? "text-emerald-500" : overallBalance < 0 ? "text-rose-500" : "text-base-content/60"
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
        <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">Friends</h3>
        <span className="text-xs text-base-content/60 bg-base-300 px-2.5 py-1 rounded-full">
          {balances.length} {balances.length === 1 ? "friend" : "friends"}
        </span>
      </div>

      {/* Friend List Tiles */}
      <div className="rounded-2xl overflow-hidden bg-base-100/50">
        {balances.map((balance, index) => {
          const isSettleable = canSettle(balance.net_balance);
          const isRequestable = canRequestPayment(balance.net_balance);
          const isClickable = isSettleable || isRequestable;
          const isPositive = balance.net_balance > 0;
          const isLast = index === balances.length - 1;

          return (
            <motion.div
              key={balance.friend_wallet}
              whileTap={isClickable ? { scale: 0.98 } : {}}
              className={`group flex items-center justify-between px-4 py-3 transition-colors ${
                isClickable ? "cursor-pointer hover:bg-base-200/50 active:bg-base-200" : "cursor-default opacity-60"
              } ${!isLast ? "border-b border-base-content/10" : ""}`}
              onClick={() => isClickable && handleFriendClick(balance)}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                {balance.friend_twitter_profile_url ? (
                  <Image
                    src={balance.friend_twitter_profile_url}
                    alt={balance.friend_twitter_handle || balance.friend_name}
                    width={44}
                    height={44}
                    className="w-11 h-11 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-neutral flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-neutral-content">
                      {balance.friend_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Name & Status */}
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{balance.friend_name}</p>
                  <p className={`text-xs font-medium ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                    {getBalanceText(balance.net_balance)}
                  </p>
                </div>
              </div>

              {/* Amount & Action */}
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold text-lg ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                  ${formatAmount(balance.net_balance)}
                </span>

                {/* Notify button - prominent clickable */}
                {isClickable && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-9 h-9 rounded-full bg-warning/20 hover:bg-warning/30 flex items-center justify-center transition-colors"
                  >
                    <Bell className="w-4 h-4 text-warning" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Settlement Modal */}
      {settlementParams && (
        <SettleModal
          isOpen={isSettleModalOpen}
          onClose={handleCloseModal}
          params={settlementParams}
          onSuccess={handleSettlementSuccess}
        />
      )}

      {/* Loading/Success Overlay */}
      {isCreatingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-base-100 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
            {requestSuccess ? (
              <>
                {/* Success State */}
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-success">Payment request sent!</p>
              </>
            ) : (
              <>
                {/* Loading State */}
                <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-base-content mb-1">Sending Request</p>
                  <p className="text-sm text-base-content/60">
                    {selectedFriend ? `To ${selectedFriend.friend_name}...` : "Please wait..."}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-success text-success-content px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium text-sm">{successMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
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

  const handleFriendClick = async (friend: FriendBalance) => {
    if (!walletAddress) return;

    // Only allow settlement if user owes the friend (negative balance)
    if (!canSettle(friend.net_balance)) {
      console.log("Cannot settle - friend owes you, not vice versa");
      return;
    }

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
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-base-content/50 text-sm mt-4">Loading your balances...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-error text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-content rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 rounded-full bg-base-300 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="text-base-content/50 font-medium">No balances yet</p>
        <p className="text-sm text-base-content/40 mt-2">Use &apos;Add Expense&apos; to start splitting with friends</p>
      </div>
    );
  }

  return (
    <>
      {/* Combined Wallet + Owed Balance Card */}
      <div className="mb-4 bg-base-300/30 rounded-xl p-3 border border-base-content/5">
        <div className="flex items-stretch justify-between gap-3">
          {/* Left: Labels + Amounts */}
          <div className="flex-1 flex flex-col justify-center gap-1.5">
            {/* Wallet Balance Row */}
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-base-content/40 min-w-[52px]">Wallet</span>
              <span className="text-base font-bold text-base-content">
                {isWalletBalanceLoading ? "..." : `$${walletBalance.toFixed(2)} USDC`}
              </span>
            </div>
            {/* Friends Balance Row */}
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-base-content/40 min-w-[52px]">Friends</span>
              <span
                className={`text-base font-bold ${overallBalance > 0 ? "text-[#00C46A]" : overallBalance < 0 ? "text-[#FF4D4F]" : "text-base-content/60"}`}
              >
                ${formatAmount(overallBalance)} USDC
              </span>
            </div>
          </div>

          {/* Right: Icon + Status Pill */}
          <div className="flex flex-col items-end justify-between py-0.5">
            {/* Wallet Icon */}
            <div className="text-base-content/30 text-lg">💳</div>
            {/* Status Pill */}
            {overallBalance !== 0 && (
              <div
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  overallBalance > 0 ? "bg-[#00C46A]/10 text-[#00C46A]" : "bg-[#FF4D4F]/10 text-[#FF4D4F]"
                }`}
              >
                {overallBalance > 0 ? "You're owed" : "You owe"}
              </div>
            )}
            {overallBalance === 0 && (
              <div className="px-2 py-0.5 bg-base-content/5 text-base-content/40 rounded-full text-[10px] font-semibold">
                Settled
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Friend Expense Cards */}
      <div className="space-y-2">
        {balances.map(balance => {
          const isSettleable = canSettle(balance.net_balance);
          return (
            <div
              key={balance.friend_wallet}
              className={`bg-base-300/30 rounded-xl p-3 border border-base-content/5 transition-all ${
                isSettleable
                  ? "cursor-pointer hover:bg-base-300/50 hover:border-primary/20 active:scale-[0.99]"
                  : "cursor-default opacity-75"
              }`}
              onClick={() => isSettleable && handleFriendClick(balance)}
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
                  <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {balance.friend_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-base-content truncate">{balance.friend_name}</p>
                </div>

                {/* Amount */}
                <p
                  className={`text-lg font-bold flex-shrink-0 ${balance.net_balance > 0 ? "text-[#00C46A]" : "text-[#FF4D4F]"}`}
                >
                  ${formatAmount(balance.net_balance)}
                </p>

                {/* Status Label */}
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider flex-shrink-0 ${
                    balance.net_balance > 0 ? "text-[#00C46A]" : "text-[#FF4D4F]"
                  }`}
                >
                  {getBalanceText(balance.net_balance)}
                </span>
              </div>
            </div>
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
    </>
  );
};

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { SettleModal } from "~~/components/settle/SettleModal";
import { type PaymentParams } from "~~/components/settle/types";
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
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <p className="text-error text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-content rounded-lg text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-base-content/50">No balances yet</p>
        <p className="text-sm text-base-content/40 mt-2">Create an expense to get started</p>
      </div>
    );
  }

  return (
    <>
      {/* Total Balance Summary */}
      <div className="mb-6">
        <p className="text-sm text-base-content/60 mb-2">Total balance</p>
        <div className="flex items-center justify-between">
          {overallBalance === 0 ? (
            <p className="text-2xl font-bold text-base-content">$0.00 USDC</p>
          ) : (
            <p className={`text-2xl font-bold ${overallBalance > 0 ? "text-success" : "text-error"}`}>
              ${formatAmount(overallBalance)} USDC
            </p>
          )}
          {overallBalance > 0 && (
            <div className="px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
              You&apos;re owed
            </div>
          )}
          {overallBalance < 0 && (
            <div className="px-3 py-1 bg-error/10 text-error rounded-full text-sm font-medium">You owe</div>
          )}
        </div>
      </div>

      {/* Friend List */}
      <div className="space-y-0">
        {balances.map((balance, index) => {
          const isSettleable = canSettle(balance.net_balance);
          return (
            <div key={balance.friend_wallet}>
              <div
                className={`flex items-center py-4 transition-colors ${
                  isSettleable ? "cursor-pointer hover:bg-base-200/50 active:bg-base-200" : "cursor-default opacity-60"
                }`}
                onClick={() => isSettleable && handleFriendClick(balance)}
              >
                {/* Avatar */}
                {balance.friend_twitter_profile_url ? (
                  <Image
                    src={balance.friend_twitter_profile_url}
                    alt={balance.friend_twitter_handle || balance.friend_name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {balance.friend_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 ml-3 min-w-0">
                  <p className="text-base font-medium text-base-content truncate">{balance.friend_name}</p>
                </div>

                {/* Amount and Status */}
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-medium ${balance.net_balance > 0 ? "text-success" : "text-error"}`}>
                      {getBalanceText(balance.net_balance)}
                    </span>
                    <span
                      className={`text-base font-semibold ${balance.net_balance > 0 ? "text-success" : "text-error"}`}
                    >
                      ${formatAmount(balance.net_balance)}
                    </span>
                  </div>
                  {isSettleable && <span className="text-xs text-primary font-medium">Tap to pay →</span>}
                </div>
              </div>
              {/* Divider */}
              {index < balances.length - 1 && <div className="h-px bg-base-content/10" />}
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { SettleModal } from "~~/components/settle/SettleModal";
import { type PaymentParams } from "~~/components/settle/types";
import { type FriendBalance } from "~~/lib/supabase";
import { getFriendBalances, getOverallBalance } from "~~/services/balanceService";

interface FriendBalancesListProps {
  userWallet: string;
}

export const FriendBalancesList = ({ userWallet }: FriendBalancesListProps) => {
  const router = useRouter();
  const [balances, setBalances] = useState<FriendBalance[]>([]);
  const [overallBalance, setOverallBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settlement modal state
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendBalance | null>(null);
  const [settlementParams, setSettlementParams] = useState<PaymentParams | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!userWallet) return;

      setLoading(true);
      setError(null);

      try {
        const [friendBalances, overall] = await Promise.all([
          getFriendBalances(userWallet),
          getOverallBalance(userWallet),
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
  }, [userWallet]);

  const formatAmount = (amount: number): string => {
    return Math.abs(amount).toFixed(2);
  };

  const getBalanceText = (balance: number): string => {
    if (balance > 0) return "owes you";
    if (balance < 0) return "you owe";
    return "settled up";
  };

  const handleFriendClick = async (friend: FriendBalance) => {
    // Only allow settlement if friend owes the user (positive balance)
    if (friend.net_balance <= 0) {
      console.log("Cannot settle - you owe this friend");
      return;
    }

    setSelectedFriend(friend);

    try {
      // Fetch token address from their expenses
      const response = await fetch(`/api/balances/token?userWallet=${userWallet}&friendWallet=${friend.friend_wallet}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch token address");
      }

      const params: PaymentParams = {
        recipient: userWallet as `0x${string}`,
        token: data.tokenAddress as `0x${string}`,
        amount: formatAmount(friend.net_balance),
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
    if (!selectedFriend || !settlementParams) return;

    try {
      // Record settlement in database
      const response = await fetch("/api/settlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payerWallet: selectedFriend.friend_wallet,
          payeeWallet: userWallet,
          amount: settlementParams.amount,
          tokenAddress: settlementParams.token,
          txHash,
        }),
      });

      if (!response.ok) {
        console.error("Failed to record settlement");
      }

      // Refresh balances to show updated amounts
      const [friendBalances, overall] = await Promise.all([
        getFriendBalances(userWallet),
        getOverallBalance(userWallet),
      ]);

      setBalances(friendBalances);
      setOverallBalance(overall);
    } catch (err) {
      console.error("Error handling settlement success:", err);
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

  return (
    <div className="min-h-screen bg-[#0E0E0E] flex flex-col">
      {/* Main content area - scrollable */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* Clean Summary Section - Only show when there are expenses */}
        {balances.length > 0 && (
          <div className="pt-4 px-4">
            {overallBalance === 0 ? (
              <p className="text-[15px] text-white/60">
                Overall, you are <span className="font-semibold">settled up</span>
              </p>
            ) : (
              <div>
                <p className="text-[15px] text-white/70 mb-1">Overall, you {overallBalance > 0 ? "are owed" : "owe"}</p>
                <p className={`text-[28px] font-bold ${overallBalance < 0 ? "text-[#FF6A4A]" : "text-[#49D792]"}`}>
                  ${formatAmount(overallBalance)} USDC
                </p>
              </div>
            )}
          </div>
        )}

        {/* Clean Friend List */}
        {balances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-white/20" />
            </div>
            <p className="text-white/50 text-sm text-center mb-1">No expenses yet</p>
            <p className="text-white/30 text-xs text-center max-w-xs">Create your first expense to split bills</p>
          </div>
        ) : (
          <div className="mt-6">
            {balances.map((balance, index) => (
              <div key={balance.friend_wallet}>
                <div
                  className="flex items-center px-4 py-3 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors cursor-pointer h-[54px]"
                  onClick={() => handleFriendClick(balance)}
                >
                  {/* Avatar - 32px */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F3B53D]/20 to-[#F3B53D]/5 flex items-center justify-center flex-shrink-0">
                    <span className="text-[13px] font-semibold text-[#F3B53D]">
                      {balance.friend_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="flex-1 ml-3 min-w-0">
                    <p className="text-[15px] font-medium text-white truncate">{balance.friend_name}</p>
                  </div>

                  {/* Right side - Status + Amount on one line */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`text-[13px] font-medium ${
                        balance.net_balance > 0 ? "text-[#49D792]" : "text-[#FF6A4A]"
                      }`}
                    >
                      {getBalanceText(balance.net_balance)}
                    </span>
                    <span
                      className={`text-[15px] font-semibold ${
                        balance.net_balance > 0 ? "text-[#49D792]" : "text-[#FF6A4A]"
                      }`}
                    >
                      ${formatAmount(balance.net_balance)}
                    </span>
                  </div>
                </div>
                {/* Clean divider */}
                {index < balances.length - 1 && <div className="mx-4 h-px bg-white/[0.05]" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Add Expense button at bottom right - positioned above bottom nav */}
      <button
        onClick={() => router.push("/expense/add")}
        className="fixed bottom-24 right-4 px-5 py-3 bg-[#F3B53D] hover:bg-[#F3B53D]/90 text-black rounded-full shadow-lg hover:shadow-xl flex items-center gap-2 transition-all duration-200 hover:scale-105 z-40 font-semibold"
      >
        <Plus className="w-5 h-5" />
        <span>Add Expense</span>
      </button>

      {/* Settlement Modal */}
      {settlementParams && (
        <SettleModal
          isOpen={isSettleModalOpen}
          onClose={handleCloseModal}
          params={settlementParams}
          onSuccess={handleSettlementSuccess}
        />
      )}
    </div>
  );
};

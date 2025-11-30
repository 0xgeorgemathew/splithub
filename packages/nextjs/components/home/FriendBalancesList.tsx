"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
        {/* Clean Summary Section - No card */}
        <div className="pt-4 px-4">
          <p className="text-[13px] font-medium text-white/45 mb-2">Total balance</p>
          <div className="flex items-center justify-between">
            {overallBalance === 0 ? (
              <p className="text-[21px] font-semibold text-white/60">$0.00 USDC</p>
            ) : (
              <>
                <p className="text-[21px] font-semibold text-[#F3B53D]">${formatAmount(overallBalance)} USDC</p>
                <div
                  className={`h-[23px] px-2.5 rounded-xl flex items-center ${
                    overallBalance > 0 ? "bg-[#49D792]/15" : "bg-[#FF6A4A]/15"
                  }`}
                >
                  <span
                    className={`text-[12px] font-medium ${overallBalance > 0 ? "text-[#49D792]" : "text-[#FF6A4A]"}`}
                  >
                    {overallBalance > 0 ? "You're owed" : "You owe"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

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
                  onClick={() => {
                    // TODO: Navigate to friend detail page
                    console.log("View details for", balance.friend_name);
                  }}
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
    </div>
  );
};

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

  const getBalanceColor = (balance: number): string => {
    if (balance > 0) return "text-success"; // Green - they owe you
    if (balance < 0) return "text-error"; // Red - you owe them
    return "text-base-content/50"; // Gray - settled
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
    <div className="min-h-screen bg-[#111111] flex flex-col">
      {/* Main content area - scrollable */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-5 py-6">
          {/* Overall balance summary */}
          <div className="mb-6">
            <p className="text-sm font-medium text-base-content/60 mb-1">Overall,</p>
            {overallBalance === 0 ? (
              <p className="text-[22px] font-semibold text-base-content/70">you are settled up</p>
            ) : (
              <p className="text-[22px] font-semibold">
                {overallBalance > 0 ? (
                  <>
                    you are owed <span className="text-[#F3B53D]">${formatAmount(overallBalance)} USDC</span>
                  </>
                ) : (
                  <>
                    you owe <span className="text-[#F3B53D]">${formatAmount(overallBalance)} USDC</span>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Friend balances list */}
          {balances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-base-100 flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-base-content/30" />
              </div>
              <p className="text-base-content/50 text-sm text-center mb-2">No expenses yet</p>
              <p className="text-base-content/40 text-xs text-center max-w-xs">
                Create your first expense to split bills with friends
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {balances.map(balance => (
                <div
                  key={balance.friend_wallet}
                  className="flex items-center gap-3 px-3 py-3.5 bg-base-100 border border-base-300/40 rounded-xl hover:border-base-300 transition-colors cursor-pointer"
                  onClick={() => {
                    // TODO: Navigate to friend detail page
                    console.log("View details for", balance.friend_name);
                  }}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-bold text-primary">
                      {balance.friend_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-base-content truncate">{balance.friend_name}</p>
                  </div>

                  {/* Balance */}
                  <div className="flex flex-col items-end flex-shrink-0">
                    <p className={`text-[13px] font-medium ${getBalanceColor(balance.net_balance)}`}>
                      {getBalanceText(balance.net_balance)}
                    </p>
                    <p className={`text-base font-semibold ${getBalanceColor(balance.net_balance)}`}>
                      ${formatAmount(balance.net_balance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Add Expense button at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#111111] via-[#111111] to-transparent pointer-events-none">
        <button
          onClick={() => router.push("/expense/add")}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-content font-semibold text-base rounded-xl shadow-lg hover:shadow-primary/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 pointer-events-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Add Expense</span>
        </button>
      </div>
    </div>
  );
};

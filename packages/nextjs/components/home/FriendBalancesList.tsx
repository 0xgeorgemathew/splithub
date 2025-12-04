"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { type FriendBalance } from "~~/lib/supabase";
import { getFriendBalances } from "~~/services/balanceService";

export const FriendBalancesList = () => {
  const { user } = usePrivy();
  const [balances, setBalances] = useState<FriendBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const walletAddress = user?.wallet?.address;

  useEffect(() => {
    if (!walletAddress) return;

    const loadBalances = async () => {
      setLoading(true);
      try {
        const data = await getFriendBalances(walletAddress);
        setBalances(data);
      } catch (error) {
        console.error("Error loading balances:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBalances();
  }, [walletAddress]);

  if (loading) {
    return <div className="text-center py-12">Loading balances...</div>;
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
    <div className="space-y-3">
      {balances.map(balance => {
        const isOwed = balance.net_balance > 0;
        const amount = Math.abs(balance.net_balance);

        return (
          <div
            key={balance.friend_wallet}
            className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body p-4 flex flex-row items-center gap-3">
              {/* Avatar */}
              {balance.friend_twitter_profile_url ? (
                <Image
                  src={balance.friend_twitter_profile_url}
                  alt={balance.friend_twitter_handle || balance.friend_name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{balance.friend_name.charAt(0).toUpperCase()}</span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1">
                <h3 className="font-semibold text-base-content">{balance.friend_name}</h3>
                {balance.friend_twitter_handle && (
                  <p className="text-sm text-base-content/60">@{balance.friend_twitter_handle}</p>
                )}
              </div>

              {/* Amount */}
              <div className="text-right">
                <p className={`text-lg font-bold ${isOwed ? "text-success" : "text-error"}`}>
                  {isOwed ? "+" : "-"}${amount.toFixed(2)}
                </p>
                <p className="text-xs text-base-content/50">{isOwed ? "owes you" : "you owe"}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

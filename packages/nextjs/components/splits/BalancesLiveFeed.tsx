"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Bell, ChevronDown, Wallet } from "lucide-react";
import { type FriendBalance } from "~~/lib/supabase";

interface BalancesLiveFeedProps {
  balances: FriendBalance[];
  loading: boolean;
  onFriendClick: (friend: FriendBalance) => void;
  onNotifyFriend: (friend: FriendBalance, e: React.MouseEvent) => void;
}

const formatAmount = (amount: number): string => {
  return Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getBalanceText = (balance: number): string => {
  if (balance > 0) return "owes you";
  if (balance < 0) return "you owe";
  return "settled up";
};

const canSettle = (balance: number): boolean => {
  return balance < 0;
};

const canRequestPayment = (balance: number): boolean => {
  return balance > 0;
};

// Individual balance item - styled like payment items
const BalanceItem = ({
  balance,
  isLast,
  onFriendClick,
  onNotifyFriend,
}: {
  balance: FriendBalance;
  isLast: boolean;
  onFriendClick: (friend: FriendBalance) => void;
  onNotifyFriend: (friend: FriendBalance, e: React.MouseEvent) => void;
}) => {
  const isPositive = balance.net_balance > 0;
  const isSettleable = canSettle(balance.net_balance);
  const isRequestable = canRequestPayment(balance.net_balance);
  const isClickable = isSettleable || isRequestable;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileTap={isClickable ? { scale: 0.98 } : {}}
      onClick={() => isClickable && onFriendClick(balance)}
      className={`flex items-center justify-between py-4 px-1 transition-colors ${!isLast ? "border-b border-white/5" : ""} ${
        isClickable ? "cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.04]" : "cursor-default opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {balance.friend_twitter_profile_url ? (
          <Image
            src={balance.friend_twitter_profile_url}
            alt={balance.friend_name}
            width={44}
            height={44}
            className="w-11 h-11 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-[#2a2a2a] border border-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-white/80">{balance.friend_name.charAt(0).toUpperCase()}</span>
          </div>
        )}

        {/* Info */}
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-white truncate text-sm">{balance.friend_name}</span>
          <span className={`text-xs ${isPositive ? "text-[#00E0B8]/70" : "text-rose-500/70"}`}>
            {getBalanceText(balance.net_balance)}
          </span>
        </div>
      </div>

      {/* Amount & Actions */}
      <div className="flex items-center gap-3">
        <div className="text-right flex-shrink-0">
          <span className={`font-mono text-base font-bold ${isPositive ? "text-[#00E0B8]" : "text-rose-500"}`}>
            {isPositive ? "+" : "-"}${formatAmount(balance.net_balance)}
          </span>
          {isSettleable && <div className="text-[9px] text-rose-500/70 uppercase tracking-wider">tap to pay</div>}
          {isRequestable && <div className="text-[9px] text-[#00E0B8]/70 uppercase tracking-wider">tap to request</div>}
        </div>

        {/* Notify button */}
        {isRequestable && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              onNotifyFriend(balance, e);
            }}
            className="w-9 h-9 rounded-full bg-warning/10 hover:bg-warning/20 flex items-center justify-center transition-colors"
          >
            <Bell className="w-4 h-4 text-warning" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export const BalancesLiveFeed = ({ balances, loading, onFriendClick, onNotifyFriend }: BalancesLiveFeedProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if loading
  if (loading) {
    return null;
  }

  // Don't show section if no balances
  if (balances.length === 0) {
    return null;
  }

  // Count how many are owed to user vs user owes
  const owedToYou = balances.filter(b => b.net_balance > 0).length;
  const youOwe = balances.filter(b => b.net_balance < 0).length;

  return (
    <div className="mb-6">
      {/* Section Header - styled like LiveFeed */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-warning" />
          <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">Balances</span>
          {/* Status badges */}
          <div className="flex items-center gap-1.5">
            {owedToYou > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#00E0B8] bg-[#00E0B8]/10 px-2 py-0.5 rounded-full">
                <ArrowDownRight className="w-3 h-3" />
                {owedToYou}
              </span>
            )}
            {youOwe > 0 && (
              <span className="flex items-center gap-1 text-xs text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                {youOwe}
              </span>
            )}
          </div>
        </div>
        {balances.length > 2 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-base-300/30 hover:bg-base-300/50 rounded-full text-xs font-medium text-base-content/60 transition-colors"
          >
            {isExpanded ? "Hide" : "Show all"}
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </motion.button>
        )}
      </div>

      {/* Preview (always visible when not expanded) */}
      {!isExpanded && balances.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 relative overflow-hidden border border-white/[0.05]"
          style={{
            background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
          }}
        >
          {/* Subtle gradient overlay */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(at 20% 30%, rgba(242, 169, 0, 0.1) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(0, 224, 184, 0.08) 0%, transparent 50%)",
            }}
          />

          <div className="relative">
            {/* Show first 2 balances */}
            {balances.slice(0, 2).map((balance, index) => (
              <BalanceItem
                key={balance.friend_wallet}
                balance={balance}
                isLast={index === Math.min(1, balances.length - 1)}
                onFriendClick={onFriendClick}
                onNotifyFriend={onNotifyFriend}
              />
            ))}

            {/* Show more indicator */}
            {balances.length > 2 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full pt-3 text-center text-xs text-base-content/40 hover:text-base-content/60 transition-colors"
              >
                +{balances.length - 2} more balances
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Expanded Full List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl p-4 relative overflow-hidden border border-white/[0.05]"
              style={{
                background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
              }}
            >
              {/* Gradient overlay */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(at 20% 30%, rgba(242, 169, 0, 0.1) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(0, 224, 184, 0.08) 0%, transparent 50%)",
                }}
              />

              <div className="relative max-h-[400px] overflow-y-auto scrollbar-hide">
                {balances.map((balance, index) => (
                  <BalanceItem
                    key={balance.friend_wallet}
                    balance={balance}
                    isLast={index === balances.length - 1}
                    onFriendClick={onFriendClick}
                    onNotifyFriend={onNotifyFriend}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

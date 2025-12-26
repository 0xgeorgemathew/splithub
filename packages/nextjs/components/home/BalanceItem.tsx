"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Nfc } from "lucide-react";
import { AnimatedRequestIcon } from "~~/components/shared/AnimatedRequestIcon";
import { type FriendBalance } from "~~/lib/supabase";
import { formatCurrencyAmount } from "~~/utils/formatting";

interface BalanceItemProps {
  /** Friend balance data */
  balance: FriendBalance;
  /** Animation delay index for staggered entry */
  index: number;
  /** Whether this is the last item (affects border) */
  isLast: boolean;
  /** Whether a payment request is being processed for this friend */
  isProcessing: boolean;
  /** Whether the last action succeeded for this friend */
  isSuccess: boolean;
  /** Whether a pending request exists for this friend */
  hasPendingRequest: boolean;
  /** Handler for row click (settlement for negative balances) */
  onRowClick: (balance: FriendBalance) => void;
  /** Handler for payment request icon click (positive balances) */
  onRequestClick: (balance: FriendBalance, e: React.MouseEvent | React.KeyboardEvent) => void;
}

/**
 * Returns button text describing the balance relationship
 */
function getBalanceText(netBalance: number): string {
  if (netBalance > 0) return "owes you";
  if (netBalance < 0) return "you owe";
  return "settled up";
}

/**
 * Single friend balance item with payment request actions
 *
 * Responsibilities:
 * - Display friend's balance (owe/owed)
 * - Show payment request status via AnimatedRequestIcon
 * - Handle row click for settlements (when you owe)
 * - Handle icon click for requests/reminders (when they owe)
 */
export function BalanceItem({
  balance,
  index,
  isLast,
  isProcessing,
  isSuccess,
  hasPendingRequest,
  onRowClick,
  onRequestClick,
}: BalanceItemProps) {
  const isPositive = balance.net_balance > 0;
  const isNegative = balance.net_balance < 0;

  /**
   * Handle keyboard activation for request button (Enter or Space)
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      onRequestClick(balance, e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileTap={isNegative ? { scale: 0.98 } : {}}
      className={`group flex items-center px-4 py-5 transition-colors ${
        isNegative ? "cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.04]" : "cursor-default"
      } ${!isLast ? "border-b border-white/5" : ""}`}
      onClick={() => isNegative && onRowClick(balance)}
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
            <span className="text-lg font-bold text-white/80">{balance.friend_name.charAt(0).toUpperCase()}</span>
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
          ${formatCurrencyAmount(balance.net_balance)}
        </div>

        <div
          role={isPositive ? "button" : undefined}
          tabIndex={isPositive ? 0 : undefined}
          aria-label={isPositive ? (hasPendingRequest ? "Send payment reminder" : "Send payment request") : undefined}
          onClick={
            isPositive
              ? e => {
                  e.stopPropagation();
                  onRequestClick(balance, e);
                }
              : undefined
          }
          onKeyDown={isPositive ? handleKeyDown : undefined}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            isPositive && !isProcessing && !isSuccess
              ? "cursor-pointer hover:bg-[#00E0B8]/10 focus:bg-[#00E0B8]/10 focus:outline-none focus:ring-2 focus:ring-[#00E0B8]/50"
              : ""
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
}

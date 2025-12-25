"use client";

import { AnimatedRequestIcon } from "./AnimatedRequestIcon";
import { motion } from "framer-motion";
import { Nfc } from "lucide-react";
import { BalanceAvatar } from "~~/components/shared/UserAvatar";
import { type FriendBalance } from "~~/lib/supabase";
import { canRequestPayment, canSettle, formatCurrency, getBalanceText } from "~~/utils/format";

interface BalanceItemProps {
  /** The friend balance data */
  balance: FriendBalance;
  /** Whether this is the last item in the list (affects border) */
  isLast: boolean;
  /** Callback when the balance row is clicked (for settlement) */
  onFriendClick: (friend: FriendBalance) => void;
  /** Whether there's a valid pending request for this friend */
  hasValidRequest?: boolean;
  /** Callback when the payment request icon is clicked */
  onPaymentRequestClick?: (friend: FriendBalance) => void;
  /** Whether a request is currently being processed for this friend */
  isProcessing?: boolean;
  /** Whether a request just succeeded for this friend */
  isSuccess?: boolean;
}

/**
 * Individual balance item component - displays a single friend's balance.
 * Supports settlement (click row) and payment request (click icon) actions.
 */
export const BalanceItem = ({
  balance,
  isLast,
  onFriendClick,
  hasValidRequest,
  onPaymentRequestClick,
  isProcessing,
  isSuccess,
}: BalanceItemProps) => {
  const isPositive = balance.net_balance > 0;
  const isSettleable = canSettle(balance.net_balance);
  const isRequestable = canRequestPayment(balance.net_balance);
  // Only settleable items are clickable on row (for negative balances)
  const isClickable = isSettleable;

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPaymentRequestClick && !isProcessing) {
      onPaymentRequestClick(balance);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileTap={isClickable ? { scale: 0.98 } : {}}
      onClick={() => isClickable && onFriendClick(balance)}
      className={`flex items-center justify-between py-4 px-1 transition-colors ${!isLast ? "border-b border-white/5" : ""} ${
        isClickable ? "cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.04]" : "cursor-default"
      } ${!isClickable && !isRequestable ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <BalanceAvatar
          user={{
            twitter_profile_url: balance.friend_twitter_profile_url,
            name: balance.friend_name,
          }}
          size={44}
        />

        {/* Info */}
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-white truncate text-sm">{balance.friend_name}</span>
          <span className={`text-xs ${isPositive ? "text-[#00E0B8]/70" : "text-rose-500/70"}`}>
            {getBalanceText(balance.net_balance)}
          </span>
        </div>
      </div>

      {/* Amount & Actions - CSS Grid for alignment */}
      <div className="grid grid-cols-[80px_32px] gap-2 items-center">
        <div
          className={`font-mono text-base font-bold tabular-nums text-right ${isPositive ? "text-[#00E0B8]" : "text-rose-500"}`}
        >
          ${formatCurrency(balance.net_balance)}
        </div>

        {/* Icon column - fixed width for alignment */}
        <div className="w-8 h-8 flex items-center justify-center">
          {isSettleable && <Nfc className="w-5 h-5 text-rose-500/70" />}
          {isRequestable && onPaymentRequestClick && (
            <motion.button
              whileHover={!isProcessing && !isSuccess ? { scale: 1.1 } : {}}
              whileTap={!isProcessing && !isSuccess ? { scale: 0.9 } : {}}
              onClick={handleIconClick}
              disabled={isProcessing || isSuccess}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[#00E0B8]/20"
              title={hasValidRequest ? "Send reminder" : "Send payment request"}
            >
              <AnimatedRequestIcon
                isProcessing={isProcessing ?? false}
                isSuccess={isSuccess ?? false}
                hasValidRequest={hasValidRequest ?? false}
              />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

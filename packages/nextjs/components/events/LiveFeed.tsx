"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ChevronDown } from "lucide-react";
import type { FeedPayment } from "~~/hooks/useDashboardRealtime";

interface LiveFeedProps {
  payments: FeedPayment[];
  loading: boolean;
  operatorStallIds?: number[]; // IDs of stalls the user operates (for showing processing state)
}

const formatAmount = (amount: number): string => {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

// Payment list item - styled like the splits balances list
const PaymentItem = ({
  payment,
  isLast,
  operatorStallIds,
}: {
  payment: FeedPayment;
  isLast: boolean;
  operatorStallIds?: number[];
}) => {
  // Only show "processing" state if this payment is from a stall the user operates
  const isOperatorStall = operatorStallIds?.includes(payment.stall_id) ?? false;
  const isPending = payment.status === "pending" && isOperatorStall;
  const isFailed = payment.status === "failed";

  const payerName = payment.payer_user?.twitter_handle
    ? `@${payment.payer_user.twitter_handle}`
    : `${payment.payer_wallet.slice(0, 6)}...${payment.payer_wallet.slice(-4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center justify-between py-4 px-1 ${!isLast ? "border-b border-white/5" : ""}`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {payment.payer_user?.twitter_profile_url ? (
          <Image
            src={payment.payer_user.twitter_profile_url}
            alt={payerName}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#2a2a2a] border border-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white/80">
              {payment.payer_user?.twitter_handle?.[0]?.toUpperCase() || payment.payer_wallet.slice(2, 3).toUpperCase()}
            </span>
          </div>
        )}

        {/* Info */}
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-white truncate text-sm">{payerName}</span>
          <span className="text-xs text-base-content/50">
            {payment.stall?.stall_name || "Unknown stall"} · {formatTimeAgo(payment.created_at)}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <span
          className={`font-mono text-base font-bold ${isPending ? "text-warning" : isFailed ? "text-error" : "text-[#00E0B8]"}`}
        >
          +${formatAmount(parseFloat(payment.amount.toString()))}
        </span>
        {isPending && <div className="text-[9px] text-warning/70 uppercase tracking-wider">processing</div>}
      </div>
    </motion.div>
  );
};

export const LiveFeed = ({ payments, loading, operatorStallIds }: LiveFeedProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show anything if loading
  if (loading) {
    return null;
  }

  // Don't show section if no payments
  if (payments.length === 0) {
    return null;
  }

  // Get recent count (show actual recent activity, not just the limit)
  const recentCount = payments.filter(p => {
    const date = new Date(p.created_at);
    const now = new Date();
    const hourAgo = now.getTime() - 60 * 60 * 1000;
    return date.getTime() > hourAgo;
  }).length;

  return (
    <div className="mb-6">
      {/* Section Header - styled like splits */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00E0B8]" />
          <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">Live Activity</span>
          {recentCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-[#00E0B8] bg-[#00E0B8]/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E0B8] animate-pulse" />
              {recentCount} recent
            </span>
          )}
        </div>
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
      </div>

      {/* Latest Transaction Preview (always visible) */}
      {!isExpanded && payments.length > 0 && (
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
                "radial-gradient(at 20% 30%, rgba(0, 224, 184, 0.1) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(0, 224, 184, 0.05) 0%, transparent 50%)",
            }}
          />

          <div className="relative">
            {/* Show latest 2 transactions */}
            {payments.slice(0, 2).map((payment, index) => (
              <PaymentItem
                key={payment.id}
                payment={payment}
                isLast={index === Math.min(1, payments.length - 1)}
                operatorStallIds={operatorStallIds}
              />
            ))}

            {/* Show more indicator */}
            {payments.length > 2 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full pt-3 text-center text-xs text-base-content/40 hover:text-base-content/60 transition-colors"
              >
                +{payments.length - 2} more transactions
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
                    "radial-gradient(at 20% 30%, rgba(0, 224, 184, 0.1) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(0, 224, 184, 0.05) 0%, transparent 50%)",
                }}
              />

              <div className="relative max-h-[400px] overflow-y-auto scrollbar-hide">
                {payments.map((payment, index) => (
                  <PaymentItem
                    key={payment.id}
                    payment={payment}
                    isLast={index === payments.length - 1}
                    operatorStallIds={operatorStallIds}
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

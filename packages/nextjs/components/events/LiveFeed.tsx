"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Store, Zap } from "lucide-react";
import type { FeedPayment } from "~~/hooks/useDashboardRealtime";

interface LiveFeedProps {
  payments: FeedPayment[];
  loading: boolean;
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
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

// Get avatar initial from twitter handle or wallet
const getAvatarInitial = (payment: FeedPayment): string => {
  if (payment.payer_user?.twitter_handle) {
    return payment.payer_user.twitter_handle[0].toUpperCase();
  }
  return payment.payer_wallet.slice(2, 3).toUpperCase();
};

const PaymentCard = ({ payment }: { payment: FeedPayment }) => {
  const isPending = payment.status === "pending";
  const isFailed = payment.status === "failed";
  const initial = getAvatarInitial(payment);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      layout
      className="flex justify-between items-center bg-base-100/50 backdrop-blur-md p-3 rounded-xl mb-2 border border-white/5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="avatar placeholder">
          <div
            className={`rounded-full w-9 h-9 ${
              payment.payer_user?.twitter_profile_url ? "" : "bg-neutral text-neutral-content"
            }`}
          >
            {payment.payer_user?.twitter_profile_url ? (
              <Image
                src={payment.payer_user.twitter_profile_url}
                alt={payment.payer_user.twitter_handle || "payer"}
                width={36}
                height={36}
                className="w-9 h-9 rounded-full"
              />
            ) : (
              <span className="text-sm font-bold">{initial}</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col">
          <span className="font-bold text-sm text-base-content">
            {payment.payer_user?.twitter_handle
              ? `@${payment.payer_user.twitter_handle}`
              : `${payment.payer_wallet.slice(0, 6)}...`}
          </span>
          <span className="text-[10px] text-base-content/50 flex items-center gap-1">
            <Store className="w-2.5 h-2.5" />
            {payment.stall?.stall_name || "Unknown stall"}
            <span className="text-base-content/30">·</span>
            {formatTimeAgo(payment.created_at)}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        <motion.span
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className={`font-mono font-bold ${isPending ? "text-warning" : isFailed ? "text-error" : "text-success"}`}
        >
          +${formatAmount(parseFloat(payment.amount.toString()))}
        </motion.span>
        {isPending && <div className="text-[9px] text-warning/70 uppercase tracking-wider">processing</div>}
      </div>
    </motion.div>
  );
};

export const LiveFeed = ({ payments, loading }: LiveFeedProps) => {
  if (loading) {
    return (
      <div className="w-full space-y-2 py-4">
        <div className="text-xs font-bold opacity-50 uppercase tracking-widest pl-2">Live Activity</div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 bg-base-100/30 backdrop-blur-md p-3 rounded-xl animate-pulse"
            >
              <div className="w-9 h-9 rounded-full bg-base-300/50" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-20 bg-base-300/50 rounded" />
                <div className="h-2.5 w-28 bg-base-300/30 rounded" />
              </div>
              <div className="h-5 w-14 bg-base-300/50 rounded" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="w-full space-y-2 py-4">
        <div className="text-xs font-bold opacity-50 uppercase tracking-widest pl-2">Live Activity</div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-8 px-4 bg-base-100/30 backdrop-blur-md rounded-xl border border-white/5"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-12 h-12 rounded-full bg-base-200/50 flex items-center justify-center mb-3"
          >
            <Zap className="w-6 h-6 text-base-content/30" />
          </motion.div>
          <p className="text-base-content/50 font-medium text-sm">No transactions yet</p>
          <p className="text-base-content/30 text-xs mt-0.5">Payments appear here in real-time</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 py-4">
      {/* Section Header */}
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="text-xs font-bold opacity-50 uppercase tracking-widest">Live Activity</div>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-1.5 px-2 py-0.5 bg-success/10 rounded-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] text-success font-medium">{payments.length}</span>
        </motion.span>
      </div>

      {/* Scrollable Feed with Mask Gradient */}
      <div className="relative h-[220px] overflow-hidden live-feed-mask">
        <div className="absolute inset-0 overflow-y-auto scrollbar-hide pr-1">
          <AnimatePresence initial={false} mode="popLayout">
            {payments.map(payment => (
              <PaymentCard key={payment.id} payment={payment} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, CalendarDays, ChevronRight, DollarSign, ExternalLink, Store, User, Zap } from "lucide-react";
import { type OperatorStallWithStats, useStallPaymentsRealtime } from "~~/hooks/useEventsRealtime";

interface OperatorStallCardProps {
  stall: OperatorStallWithStats;
}

export const OperatorStallCard = ({ stall }: OperatorStallCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { payments, loading: loadingPayments } = useStallPaymentsRealtime(isExpanded ? stall.id : null);

  const formatAmount = (amount: number) => amount.toFixed(2);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "paused":
        return "bg-warning/20 text-warning border-warning/30";
      default:
        return "bg-base-content/10 text-base-content/50 border-base-content/20";
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary/10 text-primary border-primary/30";
      case "paused":
        return "bg-warning/10 text-warning border-warning/30";
      case "ended":
        return "bg-base-content/10 text-base-content/50 border-base-content/20";
      default:
        return "bg-base-content/10 text-base-content/50";
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl overflow-hidden transition-all border ${
        stall.status === "active"
          ? "bg-gradient-to-br from-emerald-500/5 to-base-200/80 border-emerald-500/20"
          : "bg-base-200/50 border-base-content/5"
      }`}
    >
      {/* Main Card Content */}
      <div
        className="p-4 cursor-pointer hover:bg-base-300/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Top Row: Event Badge + Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Event Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${getEventStatusColor(stall.eventStatus)}`}
            >
              <CalendarDays className="w-3 h-3" />
              {stall.eventName}
            </div>
          </div>

          {/* Stall Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${getStatusColor(stall.status)}`}
          >
            {stall.status === "active" && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
            {stall.status}
          </div>
        </div>

        {/* Stall Name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Store className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base-content text-lg truncate">{stall.stall_name}</h3>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-base-content/30 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Revenue */}
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400/70 uppercase tracking-wider mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              Revenue
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono">${formatAmount(stall.totalRevenue)}</div>
          </div>

          {/* Transactions */}
          <div className="p-3 bg-base-100/50 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-base-content/50 uppercase tracking-wider mb-1">
              <Zap className="w-3.5 h-3.5" />
              Transactions
            </div>
            <div className="text-xl font-bold text-base-content font-mono">{stall.transactionCount}</div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-emerald-500/10 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Public URL */}
              <div className="flex items-center gap-2 p-2.5 bg-base-100/50 rounded-xl">
                <ExternalLink className="w-4 h-4 text-base-content/40 flex-shrink-0" />
                <span className="text-xs text-base-content/60 truncate flex-1 font-mono">
                  /events/{stall.eventSlug}/{stall.stall_slug}
                </span>
              </div>

              {/* Recent Payments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
                    Recent Activity
                  </span>
                  {stall.transactionCount > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-400 font-medium">Live</span>
                    </span>
                  )}
                </div>

                {loadingPayments ? (
                  <div className="flex items-center justify-center py-6">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full"
                    />
                  </div>
                ) : payments.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                      {payments.slice(0, 8).map((payment, index) => (
                        <motion.div
                          key={payment.id}
                          layout
                          initial={{ opacity: 0, x: -20, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center justify-between p-2.5 bg-base-100/60 rounded-xl"
                        >
                          <div className="flex items-center gap-2.5">
                            {payment.payer_user?.twitter_profile_url ? (
                              <Image
                                src={payment.payer_user.twitter_profile_url}
                                alt="payer"
                                width={28}
                                height={28}
                                className="w-7 h-7 rounded-full"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-medium text-base-content">
                                {payment.payer_user?.twitter_handle
                                  ? `@${payment.payer_user.twitter_handle}`
                                  : payment.payer_wallet.slice(0, 8)}
                              </span>
                              <div className="text-[10px] text-base-content/40">
                                {new Date(payment.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-emerald-400 font-mono">
                              +${parseFloat(payment.operator_amount.toString()).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-base-content/40 font-mono">
                              of ${parseFloat(payment.amount.toString()).toFixed(2)}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-2">
                      <Zap className="w-6 h-6 text-base-content/20" />
                    </div>
                    <p className="text-xs text-base-content/40">No payments yet</p>
                    <p className="text-[10px] text-base-content/30 mt-1">Payments will appear here in real-time</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

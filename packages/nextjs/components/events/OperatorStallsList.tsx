"use client";

import { OperatorStallCard } from "./OperatorStallCard";
import { AnimatePresence, motion } from "framer-motion";
import { Store, TrendingUp, Zap } from "lucide-react";
import { useOperatorStallsRealtime } from "~~/hooks/useEventsRealtime";

export const OperatorStallsList = () => {
  const { stalls, loading, error, refresh, totals } = useOperatorStallsRealtime();

  const formatAmount = (amount: number) => amount.toFixed(2);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Store className="w-5 h-5 text-emerald-500/50" />
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base-content/50 text-sm mt-4 font-medium"
        >
          Loading your stalls...
        </motion.p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center mb-4"
        >
          <svg className="w-7 h-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </motion.div>
        <p className="text-error text-sm font-medium mb-4">{error}</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => refresh()}
          className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-500/90 transition-colors shadow-lg shadow-emerald-500/20"
        >
          Try Again
        </motion.button>
      </motion.div>
    );
  }

  // Don't render anything if user has no operator stalls
  if (stalls.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      {/* Section Divider */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.4 }}
        className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent mb-8"
      />

      {/* Operator Hero Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 rounded-3xl p-6 relative overflow-hidden border border-emerald-500/10"
        style={{
          background: "linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, #0d0d0d 100%)",
          boxShadow: "0 4px 20px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        {/* Subtle mesh gradient overlay */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(at 20% 30%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(52, 211, 153, 0.1) 0%, transparent 50%)",
          }}
        />

        <div className="relative">
          {/* Label */}
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">My Operator Earnings</span>
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 rounded-full ml-auto"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-emerald-400 font-medium">Live</span>
            </motion.span>
          </div>

          {/* Main Amount */}
          <div className="mb-4">
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-bold text-emerald-400 tracking-tight font-mono"
            >
              ${formatAmount(totals.totalEarnings)}
            </motion.span>
          </div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4"
          >
            <div className="flex items-center gap-1.5">
              <Store className="w-4 h-4 text-emerald-500/70" />
              <span className="text-sm font-medium text-base-content/70">
                {totals.stallCount} {totals.stallCount === 1 ? "stall" : "stalls"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-500/70" />
              <span className="text-sm font-medium text-base-content/70">
                {totals.totalTransactions} {totals.totalTransactions === 1 ? "transaction" : "transactions"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500/70" />
              <span className="text-sm font-medium text-base-content/70">
                ${formatAmount(totals.totalRevenue)} total
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">Stalls I Operate</span>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
            {stalls.length}
          </span>
        </div>
      </div>

      {/* Stalls List */}
      <AnimatePresence mode="popLayout">
        <motion.div className="space-y-3">
          {stalls.map((stall, index) => (
            <motion.div
              key={stall.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <OperatorStallCard stall={stall} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

"use client";

import { motion } from "framer-motion";
import { CalendarDays, Plus, Store, TrendingUp, Zap } from "lucide-react";
import type { DashboardMetrics, DashboardMode } from "~~/hooks/useDashboardRealtime";

interface DashboardHeroProps {
  mode: DashboardMode;
  metrics: DashboardMetrics;
  onCreateEvent: () => void;
}

const formatAmount = (amount: number): string => {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Empty state hero - CTA to create first event (no wallet/balance shown)
const EmptyHero = ({ onCreateEvent }: { onCreateEvent: () => void }) => (
  <div className="flex flex-col min-h-[50vh] items-center justify-center text-center p-6">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="w-full max-w-sm bg-base-200/50 rounded-3xl p-8 border border-dashed border-base-content/20"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
      >
        <CalendarDays className="w-12 h-12 mx-auto mb-4 text-primary" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-2xl font-bold mb-2 text-base-content"
      >
        No Events Yet
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="opacity-60 mb-8 text-sm"
      >
        Create your first event to activate your wallet and start collecting payments.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onCreateEvent}
        className="btn btn-primary btn-wide shadow-lg shadow-primary/20"
      >
        <Plus className="w-5 h-5" />
        Create Event
      </motion.button>
    </motion.div>
  </div>
);

// Operator hero - Green theme with shift earnings
const OperatorHero = ({ metrics }: { metrics: DashboardMetrics }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="rounded-3xl p-6 relative overflow-hidden border border-emerald-500/20"
    style={{
      background: "linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, #0a0a0f 100%)",
      boxShadow:
        "0 4px 20px -5px rgba(0,0,0,0.5), 0 0 40px -10px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255,255,255,0.03)",
    }}
  >
    {/* Emerald mesh gradient */}
    <div
      className="absolute inset-0 opacity-50"
      style={{
        backgroundImage:
          "radial-gradient(at 20% 30%, rgba(16, 185, 129, 0.2) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(52, 211, 153, 0.1) 0%, transparent 50%)",
      }}
    />

    {/* Animated glow ring */}
    <motion.div
      className="absolute -top-20 -right-20 w-40 h-40 rounded-full"
      style={{
        background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />

    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">My Shift Earnings</span>
        </div>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 rounded-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-semibold">LIVE</span>
        </motion.span>
      </div>

      {/* Main Amount */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-emerald-400">$</span>
          <motion.span
            key={metrics.operatorEarnings}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold text-emerald-400 tracking-tight font-mono"
          >
            {formatAmount(metrics.operatorEarnings)}
          </motion.span>
        </div>
      </div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-4 flex-wrap"
      >
        <div className="flex items-center gap-1.5">
          <Store className="w-4 h-4 text-emerald-500/70" />
          <span className="text-sm font-medium text-base-content/70">
            {metrics.operatorStallCount} {metrics.operatorStallCount === 1 ? "stall" : "stalls"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-emerald-500/70" />
          <span className="text-sm font-medium text-base-content/70">
            {metrics.operatorTransactions} {metrics.operatorTransactions === 1 ? "sale" : "sales"}
          </span>
        </div>
      </motion.div>
    </div>
  </motion.div>
);

// Owner hero - Gold theme with total revenue
const OwnerHero = ({ metrics }: { metrics: DashboardMetrics }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="rounded-3xl p-6 relative overflow-hidden border border-warning/20"
    style={{
      background: "linear-gradient(145deg, rgba(242, 169, 0, 0.08) 0%, #0a0a0f 100%)",
      boxShadow:
        "0 4px 20px -5px rgba(0,0,0,0.5), 0 0 40px -10px rgba(242, 169, 0, 0.1), inset 0 1px 0 rgba(255,255,255,0.03)",
    }}
  >
    {/* Gold mesh gradient */}
    <div
      className="absolute inset-0 opacity-40"
      style={{
        backgroundImage:
          "radial-gradient(at 20% 30%, rgba(242, 169, 0, 0.15) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)",
      }}
    />

    {/* Animated glow ring */}
    <motion.div
      className="absolute -top-20 -right-20 w-40 h-40 rounded-full"
      style={{
        background: "radial-gradient(circle, rgba(242, 169, 0, 0.12) 0%, transparent 70%)",
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />

    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-warning" />
          <span className="text-xs font-bold text-warning uppercase tracking-wider">Total Event Revenue</span>
        </div>
        {metrics.activeEvents > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-semibold">{metrics.activeEvents} ACTIVE</span>
          </span>
        )}
      </div>

      {/* Main Amount */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-warning">$</span>
          <motion.span
            key={metrics.totalRevenue}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold text-warning tracking-tight font-mono"
          >
            {formatAmount(metrics.totalRevenue)}
          </motion.span>
        </div>
      </div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-4 flex-wrap"
      >
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-primary/70" />
          <span className="text-sm font-medium text-base-content/70">
            {metrics.eventCount} {metrics.eventCount === 1 ? "event" : "events"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Store className="w-4 h-4 text-primary/70" />
          <span className="text-sm font-medium text-base-content/70">
            {metrics.stallCount} {metrics.stallCount === 1 ? "stall" : "stalls"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-primary/70" />
          <span className="text-sm font-medium text-base-content/70">All time</span>
        </div>
      </motion.div>
    </div>
  </motion.div>
);

export const DashboardHero = ({ mode, metrics, onCreateEvent }: DashboardHeroProps) => {
  switch (mode) {
    case "empty":
      return <EmptyHero onCreateEvent={onCreateEvent} />;
    case "operator":
      return <OperatorHero metrics={metrics} />;
    case "owner":
      return <OwnerHero metrics={metrics} />;
    default:
      return <EmptyHero onCreateEvent={onCreateEvent} />;
  }
};

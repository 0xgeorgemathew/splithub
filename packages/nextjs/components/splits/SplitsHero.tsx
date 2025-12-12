"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CreditCard, Plus, TrendingUp, Users, Wallet } from "lucide-react";

interface SplitsHeroProps {
  walletBalance: number;
  overallBalance: number;
  isWalletLoading: boolean;
  friendCount: number;
  onAddExpense: () => void;
}

const formatCurrency = (amount: number): string => {
  return Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Color schemes
const COLORS = {
  positive: {
    primary: "#00E0B8", // Teal - they owe you
    rgb: "0, 224, 184",
  },
  negative: {
    primary: "#F43F5E", // Rose - you owe
    rgb: "244, 63, 94",
  },
  neutral: {
    primary: "#F2A900", // Gold/Warning - wallet balance
    rgb: "242, 169, 0",
  },
};

// Hero Card with balance data
const HeroCard = ({ walletBalance, overallBalance, isWalletLoading, friendCount, onAddExpense }: SplitsHeroProps) => {
  const isPositive = overallBalance > 0;
  const isNeutral = overallBalance === 0;

  // Build gradient based on balance status
  const getGradientOverlay = () => {
    if (isNeutral) {
      return `radial-gradient(at 20% 30%, rgba(${COLORS.neutral.rgb}, 0.12) 0%, transparent 50%),
              radial-gradient(at 80% 70%, rgba(${COLORS.neutral.rgb}, 0.08) 0%, transparent 50%)`;
    }
    if (isPositive) {
      return `radial-gradient(at 10% 20%, rgba(${COLORS.positive.rgb}, 0.15) 0%, transparent 50%),
              radial-gradient(at 90% 80%, rgba(${COLORS.neutral.rgb}, 0.1) 0%, transparent 50%),
              radial-gradient(at 50% 50%, rgba(${COLORS.positive.rgb}, 0.05) 0%, transparent 70%)`;
    }
    return `radial-gradient(at 10% 20%, rgba(${COLORS.negative.rgb}, 0.12) 0%, transparent 50%),
            radial-gradient(at 90% 80%, rgba(${COLORS.neutral.rgb}, 0.1) 0%, transparent 50%),
            radial-gradient(at 50% 50%, rgba(${COLORS.negative.rgb}, 0.05) 0%, transparent 70%)`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 rounded-3xl p-6 relative overflow-hidden border border-white/[0.05]"
      style={{
        background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
        boxShadow: "0 4px 20px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      {/* Gradient overlay based on balance status */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: getGradientOverlay(),
        }}
      />

      {/* Top accent line showing balance status */}
      {!isNeutral && (
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: isPositive
              ? `linear-gradient(90deg, ${COLORS.positive.primary} 0%, ${COLORS.neutral.primary} 100%)`
              : `linear-gradient(90deg, ${COLORS.negative.primary} 0%, ${COLORS.neutral.primary} 100%)`,
          }}
        />
      )}

      <div className="relative">
        {/* Label */}
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-4 h-4 text-warning" />
          <span className="text-xs font-bold text-warning uppercase tracking-wider">Wallet Balance</span>
        </div>

        {/* Main Balance */}
        <div className="mb-4">
          {isWalletLoading ? (
            <span className="inline-block w-40 h-12 bg-base-300/50 rounded-xl animate-pulse" />
          ) : (
            <motion.span
              key={walletBalance}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-bold text-white tracking-tight font-mono"
            >
              ${formatCurrency(walletBalance)}
            </motion.span>
          )}
        </div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 flex-wrap"
        >
          {/* Friends Balance Status */}
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <ArrowDownRight className="w-4 h-4 text-[#00E0B8]" />
            ) : overallBalance < 0 ? (
              <ArrowUpRight className="w-4 h-4 text-rose-500" />
            ) : (
              <TrendingUp className="w-4 h-4 text-base-content/50" />
            )}
            <span
              className={`text-sm font-medium ${
                isPositive ? "text-[#00E0B8]" : overallBalance < 0 ? "text-rose-500" : "text-base-content/50"
              }`}
            >
              {isPositive
                ? `Owed $${formatCurrency(overallBalance)}`
                : overallBalance < 0
                  ? `You owe $${formatCurrency(overallBalance)}`
                  : "All settled"}
            </span>
          </div>

          {/* Friend Count */}
          {friendCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-base-content/50" />
              <span className="text-sm font-medium text-base-content/70">
                {friendCount} {friendCount === 1 ? "friend" : "friends"}
              </span>
            </div>
          )}
        </motion.div>

        {/* Quick Action - Add Expense */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-5 pt-4 border-t border-white/5"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAddExpense}
            className="w-full py-3.5 bg-warning/10 hover:bg-warning/20 text-warning font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Empty state hero with value proposition
const EmptyHero = ({ onAddExpense }: { onAddExpense: () => void }) => (
  <div className="flex flex-col min-h-[50vh] items-center justify-center text-center p-6">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="w-full max-w-sm rounded-3xl p-8 relative overflow-hidden border border-white/[0.05]"
      style={{
        background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
      }}
    >
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(at 30% 20%, rgba(242, 169, 0, 0.15) 0%, transparent 50%), radial-gradient(at 70% 80%, rgba(0, 224, 184, 0.1) 0%, transparent 50%)",
        }}
      />

      <div className="relative">
        {/* Feature Icons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-warning" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#00E0B8]/10 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-[#00E0B8]" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-bold mb-3 text-white"
        >
          Split Bills Effortlessly
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base-content/60 mb-6 text-sm"
        >
          Track shared expenses, settle up instantly with NFC tap payments.
        </motion.p>

        {/* Feature List */}
        <motion.ul
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-left text-sm text-base-content/70 space-y-3 mb-8"
        >
          <li className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#00E0B8]" />
            <span>Track who owes what</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#00E0B8]" />
            <span>Gasless NFC settlements</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#00E0B8]" />
            <span>Real-time balance updates</span>
          </li>
        </motion.ul>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddExpense}
          className="w-full py-4 bg-warning text-warning-content font-semibold rounded-xl shadow-lg shadow-warning/20 hover:shadow-xl hover:shadow-warning/30 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Your First Expense
        </motion.button>
      </div>
    </motion.div>
  </div>
);

export const SplitsHero = (props: SplitsHeroProps) => {
  // Show empty state if no friends
  if (props.friendCount === 0 && !props.isWalletLoading) {
    return <EmptyHero onAddExpense={props.onAddExpense} />;
  }

  return <HeroCard {...props} />;
};

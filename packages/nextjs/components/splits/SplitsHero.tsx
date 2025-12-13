"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Users, Wallet } from "lucide-react";

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
const HeroCard = ({
  walletBalance,
  overallBalance,
  isWalletLoading,
  friendCount,
}: Omit<SplitsHeroProps, "onAddExpense">) => {
  const isPositive = overallBalance > 0;
  const isNeutral = overallBalance === 0;

  // Build gradient based on balance status - single color per state, no mixing
  const getGradientOverlay = () => {
    if (isNeutral) {
      return `radial-gradient(at 20% 30%, rgba(${COLORS.neutral.rgb}, 0.12) 0%, transparent 50%),
              radial-gradient(at 80% 70%, rgba(${COLORS.neutral.rgb}, 0.08) 0%, transparent 50%)`;
    }
    if (isPositive) {
      return `radial-gradient(at 20% 30%, rgba(${COLORS.positive.rgb}, 0.12) 0%, transparent 50%),
              radial-gradient(at 80% 70%, rgba(${COLORS.positive.rgb}, 0.08) 0%, transparent 50%)`;
    }
    return `radial-gradient(at 20% 30%, rgba(${COLORS.negative.rgb}, 0.12) 0%, transparent 50%),
            radial-gradient(at 80% 70%, rgba(${COLORS.negative.rgb}, 0.08) 0%, transparent 50%)`;
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
      </div>
    </motion.div>
  );
};

export const SplitsHero = (props: SplitsHeroProps) => {
  return <HeroCard {...props} />;
};

"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import { formatCurrencyAmount } from "~~/utils/formatting";

interface WalletBalanceCardProps {
  /** USDC wallet balance */
  walletBalance: number;
  /** Overall balance with friends (positive = owed to you) */
  overallBalance: number;
  /** Whether the wallet balance is loading */
  isLoading: boolean;
}

/**
 * Hero card displaying wallet USDC balance and overall friend balance
 */
export function WalletBalanceCard({ walletBalance, overallBalance, isLoading }: WalletBalanceCardProps) {
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
      {/* Subtle mesh gradient overlay */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(at 20% 30%, rgba(242, 169, 0, 0.12) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(242, 169, 0, 0.08) 0%, transparent 50%)",
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
          {isLoading ? (
            <span className="inline-block w-40 h-12 bg-base-300/50 rounded-xl animate-pulse" />
          ) : (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-bold text-white tracking-tight font-mono"
            >
              ${walletBalance.toFixed(2)}
            </motion.span>
          )}
        </div>

        {/* Friends Balance Badge */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={`inline-flex items-center gap-2 ${overallBalance === 0 ? "opacity-60" : ""}`}
        >
          {overallBalance > 0 ? (
            <ArrowDownRight className="w-4 h-4 text-[#00E0B8]" />
          ) : overallBalance < 0 ? (
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          ) : (
            <TrendingUp className="w-4 h-4 text-base-content/50" />
          )}
          <span
            className={`text-sm font-medium ${
              overallBalance > 0 ? "text-[#00E0B8]" : overallBalance < 0 ? "text-rose-500" : "text-base-content/50"
            }`}
          >
            {overallBalance > 0
              ? `Friends owe you $${formatCurrencyAmount(overallBalance)}`
              : overallBalance < 0
                ? `You owe $${formatCurrencyAmount(overallBalance)}`
                : "All settled up"}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

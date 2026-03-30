"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Plus } from "lucide-react";

interface ChipBalanceCardProps {
  chipAddress: `0x${string}` | null;
  chipBalance: number;
  isLoading: boolean;
  onMoveToCard: () => void;
  onMoveToWallet: () => void;
}

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function ChipBalanceCard({
  chipAddress,
  chipBalance,
  isLoading,
  onMoveToCard,
  onMoveToWallet,
}: ChipBalanceCardProps) {
  const hasChip = !!chipAddress;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="mb-6 rounded-2xl p-6 relative overflow-hidden border border-white/[0.05]"
      style={{
        background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
        boxShadow: "0 4px 20px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(at 20% 30%, rgba(125, 211, 252, 0.12) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(125, 211, 252, 0.08) 0%, transparent 50%)",
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-sky-300" />
            <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">Card Balance</span>
          </div>

          {hasChip ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onMoveToCard}
                className="flex items-center gap-1 px-2.5 py-1 bg-sky-300/10 hover:bg-sky-300/20 text-sky-200 rounded-full text-[11px] font-semibold transition-colors"
              >
                <ArrowDownLeft className="w-3 h-3" />
                To Card
              </button>
              <button
                onClick={onMoveToWallet}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-400/10 hover:bg-rose-400/20 text-rose-200 rounded-full text-[11px] font-semibold transition-colors"
              >
                <ArrowUpRight className="w-3 h-3" />
                To Wallet
              </button>
            </div>
          ) : (
            <Link
              href="/register"
              className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-[11px] font-semibold transition-colors"
            >
              <Plus className="w-3 h-3" />
              Register
            </Link>
          )}
        </div>

        {hasChip ? (
          <div>
            {isLoading ? (
              <span className="inline-block w-40 h-12 bg-base-300/50 rounded-xl animate-pulse" />
            ) : (
              <motion.span
                key={chipBalance}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold text-white tracking-tight"
              >
                ${formatCurrency(chipBalance)}
              </motion.span>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-white/50">No card linked</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="mb-6 rounded-2xl border border-white/[0.05] p-4"
      style={{
        background: "linear-gradient(150deg, #181818 0%, #090909 100%)",
        boxShadow: "0 10px 32px -10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {hasChip ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-300/10">
              <CreditCard className="h-4 w-4 text-sky-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Card Balance</p>
              {isLoading ? (
                <div className="mt-1 h-6 w-24 animate-pulse rounded-lg bg-white/[0.08]" />
              ) : (
                <p className="font-mono text-lg font-bold tracking-tight text-white">
                  ${formatCurrency(chipBalance)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMoveToCard}
              className="flex items-center gap-1.5 rounded-xl border border-sky-300/15 bg-sky-300/10 px-3 py-1.5 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-300/15"
            >
              <ArrowDownLeft className="h-3 w-3" />
              To Card
            </button>
            <button
              onClick={onMoveToWallet}
              className="flex items-center gap-1.5 rounded-xl border border-rose-400/15 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-400/15"
            >
              <ArrowUpRight className="h-3 w-3" />
              To Wallet
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
              <CreditCard className="h-4 w-4 text-white/30" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Card Balance</p>
              <p className="text-sm text-white/50">No card linked</p>
            </div>
          </div>

          <Link
            href="/register"
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-slate-200"
          >
            <Plus className="h-3 w-3" />
            Register
          </Link>
        </div>
      )}
    </motion.div>
  );
}

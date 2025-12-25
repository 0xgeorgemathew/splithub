"use client";

import { motion } from "framer-motion";

/**
 * Empty state component shown when there are no balances.
 */
export const BalanceEmptyState = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 relative overflow-hidden border border-white/[0.05]"
      style={{
        background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(at 20% 30%, rgba(242, 169, 0, 0.1) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(0, 224, 184, 0.08) 0%, transparent 50%)",
        }}
      />
      <div className="relative text-center py-4">
        <p className="text-base-content/50 text-sm">No balances yet</p>
        <p className="text-base-content/30 text-xs mt-1">Add an expense to get started</p>
      </div>
    </motion.div>
  );
};

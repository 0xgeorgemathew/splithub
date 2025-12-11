"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

interface StallSuccessCardProps {
  amount: number;
  stallName: string;
  txHash: string | null;
  chainId: number;
  onDismiss: () => void;
}

// Animated checkmark SVG path
function AnimatedCheckmark() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" className="overflow-visible">
      <motion.path
        d="M10 20L17 27L30 13"
        stroke="#18181b"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: 0.4,
          delay: 0.2,
          ease: [0.65, 0, 0.35, 1],
        }}
      />
    </svg>
  );
}

export function StallSuccessCard({ amount, stallName, txHash, chainId, onDismiss }: StallSuccessCardProps) {
  const explorerUrl = txHash ? getBlockExplorerTxLink(chainId, txHash) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Success Icon - Clean, no glow */}
      <motion.div
        className="flex flex-col items-center justify-center py-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Checkmark circle - solid amber, minimal */}
        <motion.div
          className="w-16 h-16 rounded-full bg-[#FFB800] flex items-center justify-center mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 20,
            delay: 0.1,
          }}
        >
          <AnimatedCheckmark />
        </motion.div>

        {/* Status label */}
        <motion.span
          className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          Payment Complete
        </motion.span>

        {/* Amount - slightly smaller for better fit */}
        <motion.div
          className="flex items-start text-white leading-none"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <span className="text-3xl mt-2 font-medium text-zinc-400">$</span>
          <span
            className="text-[4.5rem] font-bold tracking-tighter text-white tabular-nums"
            style={{
              fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', ui-monospace, monospace",
            }}
          >
            {amount}
          </span>
        </motion.div>

        {/* Stall info */}
        <motion.p
          className="text-sm text-zinc-500 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          Paid to {stallName}
        </motion.p>

        {/* Transaction link */}
        {txHash && (
          <motion.a
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            href={explorerUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 mt-3 bg-zinc-800 rounded-full border border-zinc-700 hover:bg-zinc-700 transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-mono text-zinc-400">0x...{txHash.slice(-4)}</span>
            <ArrowUpRight className="w-3 h-3 text-zinc-500" />
          </motion.a>
        )}
      </motion.div>

      {/* Done Button - same style as TAP TO PAY */}
      <motion.div
        className="mt-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 25 }}
      >
        <motion.button
          onClick={onDismiss}
          className="w-full py-4 px-6 rounded-2xl font-bold text-lg tracking-wide bg-[#FFB800] text-zinc-900 hover:bg-[#ffc933]"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          Done
        </motion.button>
      </motion.div>
    </div>
  );
}

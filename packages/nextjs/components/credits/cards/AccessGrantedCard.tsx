"use client";

import { motion } from "framer-motion";
import { ExternalLink, Sparkles } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { colors, effects } from "~~/components/activity/styles";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

interface AccessGrantedCardProps {
  activityName: string;
  activityIcon: LucideIcon;
  creditsSpent: number;
  remainingBalance: number;
  txHash?: string | null;
  chainId: number;
  onDismiss: () => void;
}

// Checkmark draw animation
const checkmarkVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: "spring", stiffness: 100, damping: 15, delay: 0.2 },
      opacity: { duration: 0.2 },
    },
  },
};

export function AccessGrantedCard({
  activityName,
  activityIcon: ActivityIcon,
  creditsSpent,
  remainingBalance,
  txHash,
  chainId,
  onDismiss,
}: AccessGrantedCardProps) {
  const explorerUrl = txHash ? getBlockExplorerTxLink(chainId, txHash) : null;
  const truncatedHash = txHash ? `${txHash.slice(0, 8)}...${txHash.slice(-6)}` : null;

  return (
    <div className="flex flex-col items-center text-center py-4 px-2 relative">
      {/* Animated checkmark with activity icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
        style={{
          backgroundColor: colors.success.primary,
          boxShadow: effects.glow.success,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={checkmarkVariants}
            initial="hidden"
            animate="visible"
          />
        </svg>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg font-black text-white tracking-tight uppercase mb-0.5"
      >
        Access Granted
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xs text-gray-500 mb-4"
      >
        Enjoy {activityName}!
      </motion.p>

      {/* Activity icon and credits spent */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
        className="mb-1"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <ActivityIcon className="w-5 h-5 text-warning" />
          </div>
        </div>
        <div
          className="text-4xl font-black tabular-nums"
          style={{
            background: colors.reward.gradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: `drop-shadow(0 0 20px ${colors.reward.glow})`,
          }}
        >
          -{creditsSpent}
        </div>
        <div className="text-xs font-black text-warning uppercase tracking-widest mt-1">Credits Spent</div>
      </motion.div>

      {/* Remaining balance */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-sm text-gray-500 mb-4"
      >
        Remaining: {remainingBalance.toLocaleString()} CR
      </motion.p>

      {/* Transaction link */}
      {explorerUrl && (
        <motion.a
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-white/5 text-gray-400 hover:bg-white/10 transition-colors mb-4"
        >
          <span>{truncatedHash}</span>
          <ExternalLink className="w-3 h-3" />
        </motion.a>
      )}

      {/* Done button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onDismiss}
        className="btn btn-success btn-md w-full"
        style={{
          boxShadow: effects.glow.success,
        }}
      >
        <Sparkles className="w-4 h-4" />
        Start Playing
      </motion.button>
    </div>
  );
}

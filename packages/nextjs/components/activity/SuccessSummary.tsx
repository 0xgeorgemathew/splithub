"use client";

import { useEffect, useState } from "react";
import { RewardBurst } from "./RewardBurst";
import { colors, effects } from "./styles";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink } from "lucide-react";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

interface SuccessSummaryProps {
  title?: string;
  subtitle?: string;
  rewardAmount?: number;
  rewardUnit?: string;
  remainingBalance?: string | null;
  txHash?: string | null;
  chainId?: number;
  onDismiss?: () => void;
  /** "spend" for credit spending, "purchase" for credit buying */
  variant?: "spend" | "purchase";
}

// Staggered animation for elements
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
};

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

// Haptic feedback helper
const triggerHaptic = (pattern: number | number[] = [50, 30, 100]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

// Safe BigInt parsing - returns null if invalid
const safeParseBigIntBalance = (value: string | null | undefined): number | null => {
  if (!value || value.trim() === "") return null;
  try {
    return Number(BigInt(value) / BigInt(10 ** 18));
  } catch (e) {
    console.error("Failed to parse balance:", value, e);
    return null;
  }
};

export function SuccessSummary({
  title = "Payment Approved",
  subtitle,
  rewardAmount,
  rewardUnit = "CR",
  remainingBalance,
  txHash,
  chainId,
  onDismiss,
  variant = "spend",
}: SuccessSummaryProps) {
  const [showButton, setShowButton] = useState(false);
  const [rewardAnimationDone, setRewardAnimationDone] = useState(false);
  const explorerUrl = txHash && chainId ? getBlockExplorerTxLink(chainId, txHash) : null;
  const truncatedHash = txHash ? `${txHash.slice(0, 8)}...${txHash.slice(-6)}` : null;
  const balanceNumber = safeParseBigIntBalance(remainingBalance);

  // Trigger haptic on mount
  useEffect(() => {
    triggerHaptic();
  }, []);

  // Delay button appearance for dramatic effect
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center text-center py-2"
    >
      {/* Animated Checkmark Circle */}
      <motion.div variants={itemVariants} className="relative mb-5">
        {/* Outer expanding rings */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: colors.success.border }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [0.8, 1.5 + i * 0.2, 1.8 + i * 0.2],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 1,
              delay: 0.2 + i * 0.15,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Main circle - green-500 (#22c55e) */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.15, 1] }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl"
          style={{
            backgroundColor: colors.success.primary,
            boxShadow: effects.glow.success,
          }}
        >
          {/* SVG Checkmark with draw animation */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ color: colors.text.primary }}>
            <motion.path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              variants={checkmarkVariants}
              initial="hidden"
              animate="visible"
            />
          </svg>
        </motion.div>
      </motion.div>

      {/* Title - sans-serif, white */}
      <motion.h2
        variants={itemVariants}
        className="text-2xl font-bold font-sans mb-1"
        style={{ color: colors.text.primary }}
      >
        {title}
      </motion.h2>

      {/* Subtitle - gray-400 */}
      {subtitle && (
        <motion.p variants={itemVariants} className="text-sm font-sans mb-5" style={{ color: colors.text.secondary }}>
          {subtitle}
        </motion.p>
      )}

      {/* Reward Burst - The Dopamine Hit (yellow-500) */}
      {rewardAmount !== undefined && (
        <motion.div variants={itemVariants} className="mb-5 w-full flex justify-center">
          <RewardBurst
            amount={rewardAmount}
            unit={rewardUnit}
            remainingBalance={balanceNumber}
            onAnimationComplete={() => setRewardAnimationDone(true)}
            variant={variant}
          />
        </motion.div>
      )}

      {/* Transaction link - ONLY monospace text */}
      <AnimatePresence>
        {explorerUrl && rewardAnimationDone && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-5"
          >
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono transition-colors border"
              style={{
                backgroundColor: colors.surface.glass,
                borderColor: colors.surface.cardBorder,
                color: colors.text.secondary,
              }}
            >
              <span>{truncatedHash}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Done Button - green-500 (#22c55e) */}
      <AnimatePresence>
        {showButton && onDismiss && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              triggerHaptic(50);
              onDismiss();
            }}
            className="w-full py-4 px-8 rounded-2xl font-semibold font-sans text-lg transition-shadow duration-200"
            style={{
              background: `linear-gradient(135deg, ${colors.success.primary} 0%, ${colors.success.dark} 100%)`,
              boxShadow: `${effects.glow.success}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
              color: colors.text.primary,
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5" strokeWidth={2.5} />
              Done
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

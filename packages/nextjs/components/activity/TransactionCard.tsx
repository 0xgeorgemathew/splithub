"use client";

import { ReactNode } from "react";
import { HeroAmount } from "./HeroAmount";
import { colors, effects } from "./styles";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

export type CardStatus = "processing" | "success" | "error";

interface TransactionCardProps {
  status: CardStatus;
  title?: string;
  subtitle?: string;
  // Hero amount props
  amount?: string | number;
  amountUnit?: string;
  amountLabel?: string;
  // Transaction details
  txHash?: string | null;
  chainId?: number;
  error?: string | null;
  children: ReactNode;
  onRetry?: () => void;
  onDismiss?: () => void;
}

// Card spring animation
const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -20,
    transition: { duration: 0.2 },
  },
};

// Status configurations using style tokens
const statusConfig = {
  processing: {
    gradient: `linear-gradient(to bottom, ${colors.processing.bg} 0%, transparent 100%)`,
    accentColor: colors.processing.primary,
  },
  success: {
    gradient: `linear-gradient(to bottom, ${colors.success.bg} 0%, transparent 100%)`,
    accentColor: colors.success.primary,
  },
  error: {
    gradient: `linear-gradient(to bottom, ${colors.error.bg} 0%, transparent 100%)`,
    accentColor: colors.error.primary,
  },
};

export function TransactionCard({
  status,
  title,
  subtitle,
  amount,
  amountUnit = "CR",
  amountLabel,
  txHash,
  chainId,
  error,
  children,
  onRetry,
  onDismiss,
}: TransactionCardProps) {
  const config = statusConfig[status];
  const explorerUrl = txHash && chainId ? getBlockExplorerTxLink(chainId, txHash) : null;
  const truncatedHash = txHash ? `${txHash.slice(0, 8)}...${txHash.slice(-6)}` : null;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-sm mx-auto"
    >
      {/* Card container with glassmorphism */}
      <div
        className="relative overflow-hidden rounded-3xl backdrop-blur-xl border shadow-2xl"
        style={{
          backgroundColor: colors.surface.card,
          borderColor: colors.surface.cardBorder,
          boxShadow: effects.shadow.card,
        }}
      >
        {/* Animated gradient header based on status */}
        <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{ background: config.gradient }} />

        {/* Shimmer effect during processing */}
        {status === "processing" && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${colors.surface.glass} 50%, transparent 100%)`,
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 p-6">
          {/* Success/Error Icon (only shown on terminal states) */}
          <AnimatePresence>
            {(status === "success" || status === "error") && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="flex justify-center mb-4"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: status === "success" ? colors.success.bg : colors.error.bg,
                  }}
                >
                  {status === "success" ? (
                    <CheckCircle2 className="w-8 h-8" style={{ color: colors.success.primary }} strokeWidth={2} />
                  ) : (
                    <XCircle className="w-8 h-8" style={{ color: colors.error.primary }} strokeWidth={2} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hero Amount Display - shows at top during processing */}
          <AnimatePresence mode="wait">
            {amount !== undefined && (
              <motion.div key={status === "success" ? "success-amount" : "processing-amount"} className="mb-4">
                <HeroAmount
                  amount={amount}
                  unit={amountUnit}
                  label={amountLabel}
                  size={status === "processing" ? "compact" : "default"}
                  variant={status === "success" ? "success" : status === "error" ? "dimmed" : "default"}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Title and subtitle - Using sans-serif font */}
          <div className="text-center mb-5">
            <motion.h2
              key={title}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-semibold font-sans"
              style={{
                color:
                  status === "success"
                    ? colors.success.primary
                    : status === "error"
                      ? colors.error.primary
                      : colors.text.primary,
              }}
            >
              {title}
            </motion.h2>

            {subtitle && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-sm font-sans mt-1"
                style={{ color: colors.text.secondary }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>

          {/* Main content area (stepper goes here) */}
          <div className="mb-5 rounded-2xl p-4" style={{ backgroundColor: colors.surface.glass }}>
            {children}
          </div>

          {/* Transaction hash link - ONLY place for monospace */}
          <AnimatePresence>
            {explorerUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-center mb-4"
              >
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono transition-colors"
                  style={{
                    backgroundColor: colors.surface.glass,
                    color: colors.text.secondary,
                  }}
                >
                  <span>{truncatedHash}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <div
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{
                    backgroundColor: colors.error.bg,
                    border: `1px solid ${colors.error.border}`,
                  }}
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.error.primary }} />
                  <p className="text-sm font-sans" style={{ color: colors.error.primary }}>
                    {error}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <AnimatePresence>
            {(status === "success" || status === "error") && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.2 }}
                className="flex gap-3 justify-center"
              >
                {status === "success" && onDismiss && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onDismiss}
                    className="flex-1 py-3 px-6 font-semibold font-sans rounded-xl transition-colors"
                    style={{
                      backgroundColor: colors.success.primary,
                      color: colors.text.primary,
                      boxShadow: effects.glow.success,
                    }}
                  >
                    Done
                  </motion.button>
                )}

                {status === "error" && (
                  <>
                    {onRetry && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onRetry}
                        className="flex-1 py-3 px-6 font-semibold font-sans rounded-xl transition-colors"
                        style={{
                          backgroundColor: colors.processing.primary,
                          color: colors.text.primary,
                          boxShadow: effects.glow.processing,
                        }}
                      >
                        Try Again
                      </motion.button>
                    )}
                    {onDismiss && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onDismiss}
                        className="py-3 px-6 font-semibold font-sans rounded-xl transition-colors"
                        style={{
                          backgroundColor: colors.surface.elevated,
                          color: colors.text.primary,
                        }}
                      >
                        Cancel
                      </motion.button>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

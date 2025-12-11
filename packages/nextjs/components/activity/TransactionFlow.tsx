"use client";

import { ReactNode } from "react";
import { colors, effects } from "./styles";
import { AnimatePresence, motion } from "framer-motion";
import { Nfc } from "lucide-react";

interface TransactionFlowProps {
  isIdle: boolean;
  onTap?: () => void;
  disabled?: boolean;
  idleLabel?: string;
  idleAmount?: string | number;
  idleUnit?: string;
  children: ReactNode; // The TransactionStatus component
}

// Shared layout animation settings
const layoutTransition = {
  type: "spring" as const,
  stiffness: 350,
  damping: 30,
};

// Idle button variants
const idleButtonVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: { duration: 0.2 },
  },
  tap: { scale: 0.95 },
  hover: { scale: 1.02 },
};

// Processing card variants
const processingVariants = {
  initial: {
    scale: 0.9,
    opacity: 0,
    y: 20,
  },
  animate: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: layoutTransition,
  },
  exit: {
    scale: 0.9,
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

// Haptic feedback helper
const triggerHaptic = (pattern: number | number[] = 50) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

export function TransactionFlow({
  isIdle,
  onTap,
  disabled = false,
  idleLabel = "Tap to Pay",
  idleAmount,
  idleUnit = "CR",
  children,
}: TransactionFlowProps) {
  return (
    <div className="w-full max-w-sm mx-auto">
      <AnimatePresence mode="wait">
        {isIdle ? (
          /* IDLE STATE: Tap to Pay Button */
          <motion.div
            key="idle-state"
            layoutId="transaction-container"
            variants={idleButtonVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            whileHover={!disabled ? "hover" : undefined}
            whileTap={!disabled ? "tap" : undefined}
            transition={layoutTransition}
            className="flex flex-col items-center"
          >
            {/* Amount display above button */}
            {idleAmount !== undefined && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-6"
              >
                <p className="text-sm font-sans mb-1" style={{ color: colors.text.muted }}>
                  Amount
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold font-sans tabular-nums" style={{ color: colors.text.primary }}>
                    {idleAmount}
                  </span>
                  <span className="text-xl font-semibold font-sans" style={{ color: colors.text.muted }}>
                    {idleUnit}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Tap to Pay button with morphing container */}
            <motion.button
              layoutId="transaction-card"
              onClick={() => {
                triggerHaptic([50, 30, 50]);
                onTap?.();
              }}
              disabled={disabled}
              className="relative w-32 h-32 rounded-full flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(145deg, ${colors.reward.gold}, ${colors.reward.primary})`,
                boxShadow: `${effects.glow.reward}, ${effects.shadow.button}`,
                border: "3px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              {/* Inner breathing ring */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.2, 0.35, 0.2],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-3 rounded-full border-2 pointer-events-none"
                style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}
              />

              {/* NFC Icon */}
              <Nfc className="w-10 h-10 mb-1" style={{ color: colors.text.primary }} />
              <span className="text-sm font-bold font-sans" style={{ color: colors.text.primary }}>
                {idleLabel}
              </span>

              {/* Pulse rings */}
              {[0, 1, 2].map(i => (
                <motion.div
                  key={`pulse-${i}`}
                  className="absolute inset-0 rounded-full border-2 pointer-events-none"
                  style={{ borderColor: colors.reward.border }}
                  animate={{
                    scale: [1, 1.3, 1.5],
                    opacity: [0, 0.5, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    delay: i * 0.8,
                    ease: "easeOut",
                  }}
                />
              ))}
            </motion.button>

            {/* Hint text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-sans mt-4"
              style={{ color: colors.text.disabled }}
            >
              Hold your chip to the device
            </motion.p>
          </motion.div>
        ) : (
          /* PROCESSING STATE: Transaction Card */
          <motion.div
            key="processing-state"
            layoutId="transaction-container"
            variants={processingVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={layoutTransition}
          >
            {/* The TransactionStatus component goes here */}
            <motion.div layoutId="transaction-card">{children}</motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

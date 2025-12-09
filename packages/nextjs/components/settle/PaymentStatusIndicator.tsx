"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Nfc } from "lucide-react";

export type PaymentStatus = "idle" | "processing" | "success";

interface PaymentStatusIndicatorProps {
  status: PaymentStatus;
  processingText?: string;
  onTap?: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: {
    container: "w-20 h-20",
    icon: "w-6 h-6",
    checkIcon: "w-8 h-8",
    text: "text-[9px]",
    statusText: "text-base",
  },
  md: {
    container: "w-24 h-24",
    icon: "w-8 h-8",
    checkIcon: "w-10 h-10",
    text: "text-xs",
    statusText: "text-lg",
  },
  lg: {
    container: "w-32 h-32",
    icon: "w-12 h-12",
    checkIcon: "w-14 h-14",
    text: "text-sm",
    statusText: "text-xl",
  },
};

// Haptic feedback helper
const triggerHaptic = () => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(50);
  }
};

export function PaymentStatusIndicator({
  status,
  processingText = "Processing...",
  onTap,
  disabled = false,
  size = "md",
}: PaymentStatusIndicatorProps) {
  const config = sizeConfig[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <AnimatePresence mode="wait">
        {/* IDLE State - Tap to Pay Button */}
        {status === "idle" && (
          <motion.button
            key="idle-btn"
            layoutId="payment-indicator"
            onClick={() => {
              triggerHaptic();
              onTap?.();
            }}
            disabled={disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`${config.container} rounded-full flex flex-col items-center justify-center text-primary-content disabled:opacity-50 disabled:cursor-not-allowed relative`}
            style={{
              background: "linear-gradient(145deg, #f2a900, #d99400)",
              boxShadow: "0 0 30px rgba(242, 169, 0, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)",
              border: "3px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {/* Inner breathing ring */}
            <motion.div
              animate={{
                scale: [1, 1.03, 1],
                opacity: [0.15, 0.25, 0.15],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-2 rounded-full border-2 border-white/15 pointer-events-none"
            />

            <Nfc className={`${config.icon} mb-0.5`} />
            <span className={`${config.text} font-bold`}>Tap to Pay</span>

            {/* Ambient pulse rings */}
            {[0, 1, 2].map(i => (
              <motion.div
                key={`pulse-${i}`}
                className="absolute inset-0 rounded-full border-2 border-warning/40 pointer-events-none"
                animate={{
                  scale: [1, 1.2, 1.4],
                  opacity: [0, 0.4, 0],
                }}
                transition={{
                  duration: 2.1,
                  repeat: Infinity,
                  delay: i * 0.7,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.button>
        )}

        {/* PROCESSING State - Loading Ring */}
        {status === "processing" && (
          <motion.div key="processing" layoutId="payment-indicator" className={`${config.container} relative`}>
            {/* Spinning conic gradient border */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full"
              style={{
                background: "conic-gradient(from 0deg, transparent 0%, #f2a900 40%, #f2a900 60%, transparent 100%)",
                padding: "4px",
              }}
            >
              <div className="w-full h-full rounded-full bg-base-200" />
            </motion.div>

            {/* Inner circle with NFC icon */}
            <div className="absolute inset-1 rounded-full bg-base-300/50 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Nfc className={`${config.icon} text-warning`} />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* SUCCESS State - Check Circle */}
        {status === "success" && (
          <motion.div
            key="success"
            layoutId="payment-indicator"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className={`${config.container} rounded-full bg-success flex items-center justify-center`}
            style={{
              boxShadow: "0 0 40px rgba(54, 211, 153, 0.5), 0 8px 32px rgba(0, 0, 0, 0.2)",
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
            >
              <Check className={`${config.checkIcon} text-success-content`} strokeWidth={3} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Status Text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={status === "processing" ? processingText : status}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`${config.statusText} font-semibold text-base-content`}
        >
          {status === "idle" && ""}
          {status === "processing" && processingText}
          {status === "success" && "Sent!"}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

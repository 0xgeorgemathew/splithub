"use client";

import { motion } from "framer-motion";

export type LedState = "idle" | "processing" | "success" | "error";

interface POSLedProps {
  state: LedState;
}

// LED color configurations
const ledColors = {
  idle: {
    bg: "#22c55e",
    glow: "rgba(34, 197, 94, 0.6)",
  },
  processing: {
    bg: "#f2a900",
    glow: "rgba(242, 169, 0, 0.6)",
  },
  success: {
    bg: "#22c55e",
    glow: "rgba(34, 197, 94, 0.8)",
  },
  error: {
    bg: "#22c55e",
    glow: "rgba(34, 197, 94, 0.6)",
  },
};

export function POSLed({ state }: POSLedProps) {
  const colors = ledColors[state];

  // Processing state: blink animation
  if (state === "processing") {
    return (
      <motion.div
        className="pos-led"
        style={{
          background: colors.bg,
          boxShadow: `0 0 8px ${colors.glow}`,
        }}
        animate={{
          opacity: [1, 0.3, 1],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    );
  }

  // Success state: pulsing glow animation
  if (state === "success") {
    return (
      <motion.div
        className="pos-led"
        style={{
          background: colors.bg,
        }}
        animate={{
          boxShadow: [`0 0 8px ${colors.glow}`, `0 0 16px ${colors.glow}`, `0 0 8px ${colors.glow}`],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    );
  }

  // Idle/Error state: static LED
  return (
    <motion.div
      className="pos-led"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        background: colors.bg,
        boxShadow: `0 0 8px ${colors.glow}`,
      }}
      transition={{
        duration: 0.3,
      }}
    />
  );
}

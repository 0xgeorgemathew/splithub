"use client";

import { motion } from "framer-motion";

export type LedState = "idle" | "processing" | "success" | "error" | "ready";

interface POSLedProps {
  state: LedState;
}

// LED color configurations with multi-layer glow
const ledColors = {
  idle: {
    bg: "#22c55e",
    core: "#4ade80", // Brighter center
    glow: "rgba(34, 197, 94, 0.6)",
    glowIntense: "rgba(34, 197, 94, 0.9)",
  },
  ready: {
    bg: "#22c55e",
    core: "#4ade80",
    glow: "rgba(34, 197, 94, 0.6)",
    glowIntense: "rgba(34, 197, 94, 0.9)",
  },
  processing: {
    bg: "#f2a900",
    core: "#fbbf24",
    glow: "rgba(242, 169, 0, 0.6)",
    glowIntense: "rgba(242, 169, 0, 0.9)",
  },
  success: {
    bg: "#22c55e",
    core: "#86efac",
    glow: "rgba(34, 197, 94, 0.8)",
    glowIntense: "rgba(34, 197, 94, 1)",
  },
  error: {
    bg: "#22c55e",
    core: "#4ade80",
    glow: "rgba(34, 197, 94, 0.6)",
    glowIntense: "rgba(34, 197, 94, 0.9)",
  },
};

// Generate multi-layer glow boxShadow
const getGlowShadow = (glow: string, glowIntense: string, intensity: number = 1) => {
  return `
    0 0 ${4 * intensity}px ${glowIntense},
    0 0 ${8 * intensity}px ${glow},
    0 0 ${16 * intensity}px ${glow},
    inset 0 0 2px rgba(255, 255, 255, 0.3)
  `;
};

export function POSLed({ state }: POSLedProps) {
  const colors = ledColors[state];

  // Processing state: blink animation with enhanced glow
  if (state === "processing") {
    return (
      <motion.div
        className="pos-led"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${colors.core} 0%, ${colors.bg} 60%)`,
        }}
        animate={{
          opacity: [1, 0.4, 1],
          boxShadow: [
            getGlowShadow(colors.glow, colors.glowIntense, 1),
            getGlowShadow(colors.glow, colors.glowIntense, 0.3),
            getGlowShadow(colors.glow, colors.glowIntense, 1),
          ],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    );
  }

  // Success state: pulsing glow animation with enhanced effect
  if (state === "success") {
    return (
      <motion.div
        className="pos-led"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${colors.core} 0%, ${colors.bg} 60%)`,
        }}
        animate={{
          boxShadow: [
            getGlowShadow(colors.glow, colors.glowIntense, 1),
            getGlowShadow(colors.glow, colors.glowIntense, 1.8),
            getGlowShadow(colors.glow, colors.glowIntense, 1),
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    );
  }

  // Idle/Ready/Error state: static LED with realistic glow
  return (
    <motion.div
      className="pos-led"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
      }}
      style={{
        background: `radial-gradient(circle at 30% 30%, ${colors.core} 0%, ${colors.bg} 60%)`,
        boxShadow: getGlowShadow(colors.glow, colors.glowIntense, 1),
      }}
      transition={{
        duration: 0.3,
      }}
    />
  );
}

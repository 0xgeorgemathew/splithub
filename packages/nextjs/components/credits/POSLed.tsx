"use client";

import { motion } from "framer-motion";

export type LedState = "idle" | "processing" | "success" | "error" | "ready";

interface POSLedProps {
  state: LedState;
}

// LED color configurations with multi-layer glow
const ledColors = {
  idle: {
    bg: "#374151", // gray-700
    core: "#9ca3af", // gray-400
    glow: "rgba(156, 163, 175, 0.3)",
    glowIntense: "rgba(156, 163, 175, 0.5)",
  },
  ready: {
    bg: "#22c55e",
    core: "#4ade80",
    glow: "rgba(34, 197, 94, 0.6)",
    glowIntense: "rgba(34, 197, 94, 0.9)",
  },
  processing: {
    bg: "#d97706", // amber-600
    core: "#fbbf24", // amber-400
    glow: "rgba(251, 191, 36, 0.6)",
    glowIntense: "rgba(251, 191, 36, 0.9)",
  },
  success: {
    bg: "#16a34a", // green-600
    core: "#4ade80", // green-400
    glow: "rgba(34, 197, 94, 0.8)",
    glowIntense: "rgba(34, 197, 94, 1)",
  },
  error: {
    bg: "#dc2626", // red-600
    core: "#f87171", // red-400
    glow: "rgba(239, 68, 68, 0.6)",
    glowIntense: "rgba(239, 68, 68, 0.9)",
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

  // Idle state: faint white breathing animation
  if (state === "idle") {
    return (
      <motion.div
        className="pos-led"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${colors.core} 0%, ${colors.bg} 60%)`,
        }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
          boxShadow: [
            getGlowShadow(colors.glow, colors.glowIntense, 0.3),
            getGlowShadow(colors.glow, colors.glowIntense, 0.6),
            getGlowShadow(colors.glow, colors.glowIntense, 0.3),
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    );
  }

  // Processing state: pulsing yellow with enhanced glow
  if (state === "processing") {
    return (
      <motion.div
        className="pos-led"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${colors.core} 0%, ${colors.bg} 60%)`,
        }}
        animate={{
          opacity: [1, 0.5, 1],
          boxShadow: [
            getGlowShadow(colors.glow, colors.glowIntense, 1.2),
            getGlowShadow(colors.glow, colors.glowIntense, 0.4),
            getGlowShadow(colors.glow, colors.glowIntense, 1.2),
          ],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    );
  }

  // Success state: solid green with pulsing glow
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
            getGlowShadow(colors.glow, colors.glowIntense, 2),
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

  // Error state: flashing red
  if (state === "error") {
    return (
      <motion.div
        className="pos-led"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${colors.core} 0%, ${colors.bg} 60%)`,
        }}
        animate={{
          opacity: [1, 0.2, 1],
          boxShadow: [
            getGlowShadow(colors.glow, colors.glowIntense, 1.5),
            getGlowShadow(colors.glow, colors.glowIntense, 0.2),
            getGlowShadow(colors.glow, colors.glowIntense, 1.5),
          ],
        }}
        transition={{
          duration: 0.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    );
  }

  // Ready state: static LED with realistic glow
  return (
    <motion.div
      className="pos-led"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        background: `radial-gradient(circle at 30% 30%, ${colors.core} 0%, ${colors.bg} 60%)`,
        boxShadow: getGlowShadow(colors.glow, colors.glowIntense, 1),
      }}
      transition={{ duration: 0.3 }}
    />
  );
}

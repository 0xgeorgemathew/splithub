"use client";

import { AnimatePresence, motion } from "framer-motion";
import { colors } from "~~/components/activity/styles";

interface ProcessingCardProps {
  phase: "sending" | "confirming";
}

const phaseConfig = {
  sending: {
    title: "Sending Transaction",
    subtitle: "Broadcasting to the network...",
  },
  confirming: {
    title: "Confirming",
    subtitle: "Waiting for blockchain confirmation...",
  },
};

export function ProcessingCard({ phase }: ProcessingCardProps) {
  const config = phaseConfig[phase];

  return (
    <div className="flex flex-col items-center text-center py-8">
      {/* Processing indicator */}
      <div className="relative mb-6">
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: colors.processing.bg }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Spinner - shared layout with TAP TO PAY button */}
        <motion.div
          layoutId="hero-action-element"
          className="relative w-20 h-20 flex items-center justify-center rounded-full bg-primary/20"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <span className="loading loading-spinner loading-lg text-warning"></span>
        </motion.div>
      </div>

      {/* Animated status text - transitions on phase change */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <h2 className="text-3xl font-black text-white tracking-tight mb-2">{config.title}</h2>
          <p className="text-sm text-gray-500">{config.subtitle}</p>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-6">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-warning"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

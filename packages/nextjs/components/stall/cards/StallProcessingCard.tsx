"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Wifi } from "lucide-react";

interface StallProcessingCardProps {
  phase: "sending" | "confirming";
}

// Smooth easing
const smoothEase = [0.4, 0, 0.2, 1];

// Single ring component
function PulseRing({ delay }: { delay: number }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full border border-[#FFB800]"
      initial={{ scale: 1, opacity: 0 }}
      animate={{
        scale: [1, 1.8, 2.4],
        opacity: [0, 0.5, 0],
      }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        delay,
        ease: "easeOut",
        times: [0, 0.3, 1],
      }}
    />
  );
}

export function StallProcessingCard({ phase }: StallProcessingCardProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full py-8">
      {/* Icon Container */}
      <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
        {/* Pulse rings */}
        <div className="absolute w-20 h-20">
          <PulseRing delay={0} />
          <PulseRing delay={0.8} />
          <PulseRing delay={1.6} />
        </div>

        {/* Icon circle */}
        <motion.div
          className="relative z-10 w-20 h-20 rounded-full bg-[#FFB800]/15 flex items-center justify-center border border-[#FFB800]/30"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {/* Glow */}
          <motion.div
            className="absolute inset-0 rounded-full bg-[#FFB800]"
            animate={{ opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: smoothEase }}
            style={{ filter: "blur(10px)" }}
          />
          <Wifi className="relative z-10 w-10 h-10 text-[#FFB800]" />
        </motion.div>
      </div>

      {/* Text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          className="text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: smoothEase }}
        >
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
            {phase === "sending" ? "Verifying..." : "Confirming"}
          </h2>
          <p className="text-zinc-500 text-sm font-medium tracking-wide">communicating with base network</p>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex gap-2 mt-6">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#FFB800]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: smoothEase,
            }}
          />
        ))}
      </div>
    </div>
  );
}

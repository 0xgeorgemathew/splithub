"use client";

import { motion } from "framer-motion";
import { Nfc } from "lucide-react";

interface StallTapCardProps {
  amount: number;
}

// Smooth easing
const smoothEase = [0.4, 0, 0.2, 1];

// Single ring component with proper lifecycle
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

export function StallTapCard({ amount }: StallTapCardProps) {
  return (
    <motion.div
      className="flex flex-col items-center text-center py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Icon Container */}
      <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
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
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 2, repeat: Infinity, ease: smoothEase }}
            style={{ filter: "blur(12px)" }}
          />
          <Nfc className="relative z-10 w-10 h-10 text-[#FFB800]" />
        </motion.div>
      </div>

      {/* Amount */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: smoothEase }}
      >
        <div
          className="text-4xl font-black text-white tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', ui-monospace, monospace" }}
        >
          ${amount}
          <span className="text-lg text-zinc-500">.00</span>
        </div>
      </motion.div>

      {/* Message */}
      <motion.h2
        className="text-xl font-black text-white tracking-tight mb-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: smoothEase }}
      >
        Tap your chip
      </motion.h2>

      <motion.p
        className="text-sm text-zinc-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        Hold your chip near the device
      </motion.p>
    </motion.div>
  );
}

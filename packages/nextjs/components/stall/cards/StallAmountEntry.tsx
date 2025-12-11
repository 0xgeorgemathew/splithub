"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Nfc } from "lucide-react";

interface StallAmountEntryProps {
  amount: number;
  onAmountChange: (amount: number) => void;
  onSubmit: () => void;
  disabled: boolean;
}

const PRESET_AMOUNTS = [1, 5, 10, 20];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const keypadButtonVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
};

export function StallAmountEntry({ amount, onAmountChange, onSubmit, disabled }: StallAmountEntryProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Amount Display */}
      <motion.div
        className="flex flex-col items-center justify-center py-6"
        layout
        key={amount}
        initial={{ scale: 0.98, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-3">Total Payment</span>

        <div className="flex items-start text-white leading-none">
          <span className="text-4xl mt-3 font-medium text-zinc-400">$</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={amount}
              className="text-[5.5rem] font-bold tracking-tighter text-white tabular-nums"
              style={{
                fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', ui-monospace, monospace",
                textShadow: "0 4px 30px rgba(255, 255, 255, 0.1)",
              }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {amount}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Clean USDC indicator */}
        <div className="flex items-center gap-2 mt-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FFB800]" />
          <span className="text-sm font-medium text-zinc-400">USDC on Base</span>
        </div>
      </motion.div>

      {/* Preset Amount Keypad */}
      <motion.div className="grid grid-cols-4 gap-3" variants={containerVariants} initial="hidden" animate="visible">
        {PRESET_AMOUNTS.map(preset => (
          <motion.button
            key={preset}
            onClick={() => onAmountChange(preset)}
            className={`py-4 px-2 rounded-2xl text-base font-bold transition-colors ${
              amount === preset
                ? "bg-amber-400 text-zinc-900 border-2 border-amber-400 shadow-lg shadow-amber-400/20"
                : "bg-zinc-800 text-zinc-300 border-2 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600"
            }`}
            disabled={disabled}
            variants={keypadButtonVariants}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            ${preset}
          </motion.button>
        ))}
      </motion.div>

      {/* Tap to Pay Button */}
      <motion.div
        className="mt-3 relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Smooth glow pulse - separate from button */}
        {!disabled && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-[#FFB800]"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: [0.4, 0, 0.6, 1], // Custom smooth easing
            }}
            style={{
              filter: "blur(20px)",
              transform: "translateY(4px)",
            }}
          />
        )}

        <motion.button
          onClick={onSubmit}
          disabled={disabled}
          className="relative w-full py-5 px-6 rounded-2xl font-bold text-lg tracking-wide bg-[#FFB800] text-zinc-900 hover:bg-[#ffc933] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          aria-label="Tap to pay"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="flex items-center justify-center gap-3">
            <Nfc className="w-6 h-6 text-zinc-900" strokeWidth={2} />
            <span>TAP TO PAY</span>
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
}

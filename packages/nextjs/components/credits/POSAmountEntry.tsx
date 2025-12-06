"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Nfc } from "lucide-react";

interface POSAmountEntryProps {
  amount: number;
  onAmountChange: (amount: number) => void;
  onSubmit: () => void;
  disabled: boolean;
}

const PRESET_AMOUNTS = [1, 10, 20, 50];

// Animation variants
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

export function POSAmountEntry({ amount, onAmountChange, onSubmit, disabled }: POSAmountEntryProps) {
  const creditsToReceive = amount * 10;

  return (
    <div className="pos-amount-entry">
      {/* Amount Display */}
      <motion.div
        className="pos-amount-display"
        key={amount}
        initial={{ scale: 0.98, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <div className="pos-amount-label">AMOUNT</div>
        <div className="pos-amount-value">
          <span className="pos-currency">$</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={amount}
              className="pos-amount-number"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {amount}
            </motion.span>
          </AnimatePresence>
          <span className="pos-amount-decimal">.00</span>
        </div>
        <div className="pos-amount-token">USDC</div>
      </motion.div>

      {/* Preset Amount Keypad */}
      <motion.div className="pos-keypad" variants={containerVariants} initial="hidden" animate="visible">
        {PRESET_AMOUNTS.map(preset => (
          <motion.button
            key={preset}
            onClick={() => onAmountChange(preset)}
            className={`pos-keypad-btn ${amount === preset ? "pos-keypad-btn-active" : ""}`}
            disabled={disabled}
            variants={keypadButtonVariants}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            ${preset}
          </motion.button>
        ))}
      </motion.div>

      {/* Credits Preview */}
      <motion.div
        className="pos-credits-preview"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="pos-preview-row">
          <span className="pos-preview-label">CREDITS (10x)</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={creditsToReceive}
              className="pos-preview-value"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              +{creditsToReceive}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="pos-preview-row">
          <span className="pos-preview-label">NETWORK FEE</span>
          <span className="pos-preview-free">FREE</span>
        </div>
      </motion.div>

      {/* Tap to Pay Button */}
      <motion.div
        className="pos-tap-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 25 }}
      >
        <motion.button
          onClick={onSubmit}
          disabled={disabled}
          className="pos-tap-pay-btn"
          aria-label="Tap to pay"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            className="pos-tap-icon-wrapper"
            animate={{
              boxShadow: ["0 0 0 0 rgba(34, 197, 94, 0.4)", "0 0 0 12px rgba(34, 197, 94, 0)"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          >
            <Nfc className="w-8 h-8" strokeWidth={1.5} />
          </motion.div>
          <span className="pos-tap-text">TAP TO PAY</span>
        </motion.button>
      </motion.div>
    </div>
  );
}

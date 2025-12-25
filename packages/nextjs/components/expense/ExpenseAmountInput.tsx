"use client";

import { motion } from "framer-motion";
import { staggerItem } from "~~/components/shared/animations/common.animations";

interface ExpenseAmountInputProps {
  /** Current amount value */
  value: string;
  /** Callback when amount changes */
  onChange: (value: string) => void;
  /** Whether the input is focused */
  isFocused: boolean;
  /** Callback when focus changes */
  onFocusChange: (focused: boolean) => void;
}

/**
 * Amount input component with focus animation ring.
 */
export const ExpenseAmountInput = ({ value, onChange, isFocused, onFocusChange }: ExpenseAmountInputProps) => {
  return (
    <motion.div variants={staggerItem} className="px-4 py-2.5 border-b border-base-300/50">
      <motion.div
        animate={{
          boxShadow: isFocused ? "0 0 0 2px rgba(var(--primary-rgb), 0.5)" : "0 0 0 0px transparent",
        }}
        transition={{ duration: 0.2 }}
        className="flex justify-center py-2.5 bg-base-100/50 rounded-lg"
      >
        <div className="relative flex items-baseline">
          <span className="text-xl font-bold text-primary mr-0.5">$</span>
          <input
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => onFocusChange(true)}
            onBlur={() => onFocusChange(false)}
            placeholder="0.00"
            className="bg-transparent text-center text-3xl font-bold outline-none w-32 placeholder:text-base-content/20 caret-primary"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

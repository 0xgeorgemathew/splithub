"use client";

import { motion } from "framer-motion";
import { staggerItem } from "~~/components/shared/animations/common.animations";

interface ExpenseDescriptionInputProps {
  /** Current description value */
  value: string;
  /** Callback when description changes */
  onChange: (value: string) => void;
}

/**
 * Description input component for expense purpose.
 */
export const ExpenseDescriptionInput = ({ value, onChange }: ExpenseDescriptionInputProps) => {
  return (
    <motion.div variants={staggerItem} className="px-4 py-2 border-b border-base-300/50">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="What's this for?"
        className="w-full h-9 px-3 bg-base-100 text-sm text-base-content placeholder:text-base-content/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
      />
    </motion.div>
  );
};

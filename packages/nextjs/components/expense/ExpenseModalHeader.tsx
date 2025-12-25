"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { staggerItem } from "~~/components/shared/animations/common.animations";

interface ExpenseModalHeaderProps {
  /** Callback when close button is clicked */
  onClose: () => void;
}

/**
 * Modal header with title and close button.
 */
export const ExpenseModalHeader = ({ onClose }: ExpenseModalHeaderProps) => {
  return (
    <motion.div
      variants={staggerItem}
      className="flex items-center justify-between px-4 py-3 border-b border-base-300/50"
    >
      <h2 className="text-lg font-semibold text-base-content">New Expense</h2>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClose}
        className="w-8 h-8 rounded-full bg-base-300/50 hover:bg-base-300 flex items-center justify-center transition-colors"
      >
        <X className="w-5 h-5 text-base-content" />
      </motion.button>
    </motion.div>
  );
};

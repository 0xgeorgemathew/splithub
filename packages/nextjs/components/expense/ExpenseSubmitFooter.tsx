"use client";

import { motion } from "framer-motion";
import { CircleDollarSign } from "lucide-react";
import { staggerItem } from "~~/components/shared/animations/common.animations";

interface ExpenseSubmitFooterProps {
  /** Whether the form is valid for submission */
  isValid: boolean;
  /** Whether the user has a wallet connected */
  hasWallet: boolean;
  /** Callback when cancel is clicked */
  onCancel: () => void;
  /** Callback when submit is clicked */
  onSubmit: () => void;
}

/**
 * Footer with Cancel and Create Expense buttons.
 */
export const ExpenseSubmitFooter = ({ isValid, hasWallet, onCancel, onSubmit }: ExpenseSubmitFooterProps) => {
  const canSubmit = isValid && hasWallet;

  return (
    <motion.div variants={staggerItem} className="px-4 py-2.5 flex gap-2">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onCancel}
        className="flex-1 h-10 bg-base-300/50 hover:bg-base-300 text-base-content font-medium text-sm rounded-lg transition-colors"
      >
        Cancel
      </motion.button>
      <motion.button
        whileHover={canSubmit ? { scale: 1.02 } : {}}
        whileTap={canSubmit ? { scale: 0.98 } : {}}
        onClick={onSubmit}
        disabled={!canSubmit}
        className="flex-1 h-10 bg-primary hover:bg-primary/90 disabled:bg-base-300 disabled:text-base-content/40 text-primary-content font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-1.5"
      >
        <CircleDollarSign className="w-4 h-4" />
        Create Expense
      </motion.button>
    </motion.div>
  );
};

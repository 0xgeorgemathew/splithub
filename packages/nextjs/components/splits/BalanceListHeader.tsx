"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Plus, Wallet } from "lucide-react";

interface BalanceListHeaderProps {
  /** Number of balances where friends owe you */
  owedToYou: number;
  /** Number of balances where you owe friends */
  youOwe: number;
  /** Total number of balances */
  totalBalances: number;
  /** Whether the list is expanded */
  isExpanded: boolean;
  /** Callback to toggle expanded state */
  onToggleExpanded: () => void;
  /** Callback to add a new expense */
  onAddExpense: () => void;
}

/**
 * Header section for the balance list with status badges and action buttons.
 */
export const BalanceListHeader = ({
  owedToYou,
  youOwe,
  totalBalances,
  isExpanded,
  onToggleExpanded,
  onAddExpense,
}: BalanceListHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-3 px-1 gap-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <Wallet className="w-4 h-4 text-warning flex-shrink-0" />
        <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider whitespace-nowrap">
          Ledger
        </span>
        <div className="flex items-center gap-1">
          {owedToYou > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-[#00E0B8] bg-[#00E0B8]/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              <ArrowDownRight className="w-3 h-3" />
              {owedToYou}
            </span>
          )}
          {youOwe > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              <ArrowUpRight className="w-3 h-3" />
              {youOwe}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAddExpense}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-warning/10 hover:bg-warning/20 text-warning rounded-full text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Expense</span>
        </motion.button>
        {totalBalances > 2 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onToggleExpanded}
            className="flex items-center gap-1 px-2 py-1.5 bg-base-300/30 hover:bg-base-300/50 rounded-full text-xs font-medium text-base-content/60 transition-colors"
          >
            {isExpanded ? "Hide" : "Show all"}
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </motion.button>
        )}
      </div>
    </div>
  );
};

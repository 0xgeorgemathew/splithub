"use client";

import { motion } from "framer-motion";
import { Search, Users } from "lucide-react";
import { staggerItem } from "~~/components/shared/animations/common.animations";

interface ExpenseFriendSearchProps {
  /** Current search query */
  searchQuery: string;
  /** Callback when search query changes */
  onSearchChange: (query: string) => void;
  /** Whether the input is focused */
  isFocused: boolean;
  /** Callback when focus changes */
  onFocusChange: (focused: boolean) => void;
}

/**
 * Friend search input with icon and focus ring.
 */
export const ExpenseFriendSearch = ({
  searchQuery,
  onSearchChange,
  isFocused,
  onFocusChange,
}: ExpenseFriendSearchProps) => {
  return (
    <motion.div variants={staggerItem} className="px-4 py-2 border-b border-base-300/50">
      <label className="text-[10px] text-base-content/50 uppercase tracking-wider mb-1 block flex items-center gap-1">
        <Users className="w-3 h-3" /> Split with
      </label>
      <motion.div
        animate={{
          boxShadow: isFocused ? "0 0 0 2px rgba(var(--primary-rgb), 0.5)" : "0 0 0 0px transparent",
        }}
        transition={{ duration: 0.2 }}
        className="relative rounded-lg overflow-hidden"
      >
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          placeholder="Search by @handle or name..."
          className="w-full h-9 pl-8 pr-3 bg-base-100 text-sm text-base-content placeholder:text-base-content/40 focus:outline-none transition-all"
        />
      </motion.div>
    </motion.div>
  );
};

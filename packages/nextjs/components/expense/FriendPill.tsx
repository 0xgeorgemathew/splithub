"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

interface FriendPillProps {
  address: string;
  name?: string;
  onRemove: () => void;
}

export const FriendPill = ({ address, name, onRemove }: FriendPillProps) => {
  const displayName = name || `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <motion.button
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onRemove}
      className="group h-10 pl-2 pr-3 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-2 text-sm font-semibold text-base-content hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"
    >
      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary group-hover:bg-rose-500/20 group-hover:text-rose-500 transition-colors">
        {displayName.charAt(0).toUpperCase()}
      </div>
      <span className="group-hover:text-rose-500 transition-colors">{displayName}</span>
      <X className="w-3.5 h-3.5 text-base-content/40 group-hover:text-rose-500 transition-colors" />
    </motion.button>
  );
};

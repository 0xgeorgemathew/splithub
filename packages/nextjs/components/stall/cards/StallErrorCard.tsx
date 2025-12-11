"use client";

import { motion } from "framer-motion";
import { AlertCircle, RefreshCw, X } from "lucide-react";

interface StallErrorCardProps {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}

export function StallErrorCard({ message, onRetry, onDismiss }: StallErrorCardProps) {
  return (
    <motion.div
      initial={{ x: 0 }}
      animate={{ x: [0, -10, 10, -10, 10, -5, 5, 0] }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center text-center py-8 relative"
    >
      {/* Error icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-500/15"
      >
        <AlertCircle className="w-8 h-8 text-red-500" />
      </motion.div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-white mb-2">Payment Failed</h2>

      {/* Error message */}
      <div className="alert mb-6 max-w-xs bg-red-500/15 border border-red-500/30">
        <p className="text-sm text-red-500">{message}</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 w-full">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRetry}
          className="btn btn-primary flex-1"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDismiss}
          className="btn btn-ghost"
        >
          <X className="w-4 h-4" />
          Cancel
        </motion.button>
      </div>
    </motion.div>
  );
}

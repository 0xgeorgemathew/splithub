"use client";

import { motion } from "framer-motion";
import { CalendarDays, Plus, Store } from "lucide-react";
import type { ActiveContext, DashboardMode } from "~~/hooks/useDashboardRealtime";

interface DashboardHeaderProps {
  mode: DashboardMode;
  hasDualRole: boolean;
  activeContext: ActiveContext;
  onContextChange: (context: ActiveContext) => void;
  onQuickAction: () => void;
}

export const DashboardHeader = ({
  mode,
  hasDualRole,
  activeContext,
  onContextChange,
  onQuickAction,
}: DashboardHeaderProps) => {
  if (mode === "empty") return null;

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between h-12 mb-4"
    >
      {/* Left: Title */}
      <h1 className="text-lg font-bold text-base-content">Dashboard</h1>

      {/* Center: Context Toggle (only for dual-role users) */}
      {hasDualRole && (
        <div className="flex items-center bg-base-200/80 rounded-full p-1 border border-base-300/50">
          <motion.button
            onClick={() => onContextChange("owner")}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeContext === "owner" ? "text-warning" : "text-base-content/50 hover:text-base-content/70"
            }`}
          >
            {activeContext === "owner" && (
              <motion.div
                layoutId="contextIndicator"
                className="absolute inset-0 bg-warning/15 border border-warning/30 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <CalendarDays className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Owner</span>
          </motion.button>

          <motion.button
            onClick={() => onContextChange("operator")}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeContext === "operator" ? "text-emerald-400" : "text-base-content/50 hover:text-base-content/70"
            }`}
          >
            {activeContext === "operator" && (
              <motion.div
                layoutId="contextIndicator"
                className="absolute inset-0 bg-emerald-500/15 border border-emerald-500/30 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Store className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Operator</span>
          </motion.button>
        </div>
      )}

      {/* Right: Quick Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onQuickAction}
        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          activeContext === "operator" || (!hasDualRole && mode === "operator")
            ? "bg-emerald-500 hover:bg-emerald-500/90 shadow-emerald-500/25"
            : "bg-primary hover:bg-primary/90 shadow-primary/25"
        }`}
      >
        <Plus className="w-5 h-5 text-white" />
      </motion.button>
    </motion.header>
  );
};

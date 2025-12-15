"use client";

import { motion } from "framer-motion";
import { CalendarDays, Plus, Store, Zap } from "lucide-react";
import type { ActiveContext, DashboardMetrics, DashboardMode } from "~~/hooks/useDashboardRealtime";

interface DashboardHeroProps {
  mode: DashboardMode;
  metrics: DashboardMetrics;
  activeContext?: ActiveContext;
  hasDualRole?: boolean;
  onCreateEvent?: () => void;
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Determine user's actual role based on metrics (not context)
type UserRole = "owner-only" | "operator-only" | "dual-role";

const getUserRole = (metrics: DashboardMetrics, hasDualRole?: boolean): UserRole => {
  if (hasDualRole) return "dual-role";
  if (metrics.eventCount > 0 && metrics.operatorStallCount === 0) return "owner-only";
  if (metrics.operatorStallCount > 0 && metrics.eventCount === 0) return "operator-only";
  // Fallback: check which has data
  if (metrics.eventCount > 0) return "owner-only";
  if (metrics.operatorStallCount > 0) return "operator-only";
  return "owner-only"; // Default
};

// Color schemes
const COLORS = {
  owner: {
    primary: "#F2A900", // Gold/Warning
    rgb: "242, 169, 0",
  },
  operator: {
    primary: "#00E0B8", // Teal
    rgb: "0, 224, 184",
  },
};

// Hero Revenue Card - role-aware design
interface HeroCardProps {
  metrics: DashboardMetrics;
  activeContext?: ActiveContext;
  mode: DashboardMode;
  hasDualRole?: boolean;
}

const HeroCard = ({ metrics, activeContext, mode, hasDualRole }: HeroCardProps) => {
  const userRole = getUserRole(metrics, hasDualRole);

  // Determine what to show based on actual role and context
  const effectiveContext = activeContext || (mode === "operator" ? "operator" : "owner");

  // For dual-role users, show based on their selected context
  // For single-role users, show their role's data
  const showOwnerData = userRole === "owner-only" || (userRole === "dual-role" && effectiveContext === "owner");
  const showOperatorData =
    userRole === "operator-only" || (userRole === "dual-role" && effectiveContext === "operator");

  // Build gradient based on role
  const getGradientOverlay = () => {
    if (userRole === "dual-role") {
      // Blend both colors for dual-role users
      return `radial-gradient(at 10% 20%, rgba(${COLORS.owner.rgb}, 0.15) 0%, transparent 50%),
              radial-gradient(at 90% 80%, rgba(${COLORS.operator.rgb}, 0.15) 0%, transparent 50%),
              radial-gradient(at 50% 50%, rgba(${COLORS.owner.rgb}, 0.05) 0%, transparent 70%)`;
    }
    if (userRole === "operator-only") {
      return `radial-gradient(at 20% 30%, rgba(${COLORS.operator.rgb}, 0.12) 0%, transparent 50%),
              radial-gradient(at 80% 70%, rgba(${COLORS.operator.rgb}, 0.08) 0%, transparent 50%)`;
    }
    // Owner only
    return `radial-gradient(at 20% 30%, rgba(${COLORS.owner.rgb}, 0.12) 0%, transparent 50%),
            radial-gradient(at 80% 70%, rgba(${COLORS.owner.rgb}, 0.08) 0%, transparent 50%)`;
  };

  // Primary color for text based on what's being shown
  const getPrimaryColor = () => {
    if (userRole === "dual-role") {
      return effectiveContext === "owner" ? COLORS.owner.primary : COLORS.operator.primary;
    }
    return userRole === "operator-only" ? COLORS.operator.primary : COLORS.owner.primary;
  };

  const primaryColor = getPrimaryColor();

  // Determine main amount and label
  const getMainDisplay = () => {
    if (showOperatorData) {
      return {
        amount: metrics.operatorEarnings,
        label: "My Earnings",
        icon: Store,
      };
    }
    return {
      amount: metrics.totalRevenue,
      label: "Event Revenue",
      icon: CalendarDays,
    };
  };

  const mainDisplay = getMainDisplay();
  const IconComponent = mainDisplay.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 rounded-3xl p-6 relative overflow-hidden border border-white/[0.05]"
      style={{
        background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
        boxShadow: "0 4px 20px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      {/* Gradient overlay based on role */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: getGradientOverlay(),
        }}
      />

      {/* Dual-role indicator accent line */}
      {userRole === "dual-role" && (
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: `linear-gradient(90deg, ${COLORS.owner.primary} 0%, ${COLORS.operator.primary} 100%)`,
          }}
        />
      )}

      <div className="relative">
        {/* Role Badge for dual-role users */}
        {userRole === "dual-role" && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 text-base-content/50">
              {effectiveContext === "owner" ? "Event Owner View" : "Stall Operator View"}
            </span>
          </div>
        )}

        {/* Label */}
        <div className="flex items-center gap-2 mb-2">
          <IconComponent className={`w-4 h-4`} style={{ color: primaryColor }} />
          <span className={`text-xs font-bold uppercase tracking-wider`} style={{ color: primaryColor }}>
            {mainDisplay.label}
          </span>
        </div>

        {/* Main Balance */}
        <div className="mb-4">
          <motion.span
            key={mainDisplay.amount}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-bold text-white tracking-tight font-mono"
          >
            ${formatCurrency(mainDisplay.amount)}
          </motion.span>
        </div>

        {/* Stats Row - Role-appropriate */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 flex-wrap"
        >
          {showOwnerData && (
            <>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-base-content/50" />
                <span className="text-sm font-medium text-base-content/70">
                  {metrics.eventCount} {metrics.eventCount === 1 ? "event" : "events"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Store className="w-4 h-4 text-base-content/50" />
                <span className="text-sm font-medium text-base-content/70">
                  {metrics.stallCount} {metrics.stallCount === 1 ? "stall" : "stalls"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-base-content/50" />
                <span className="text-sm font-medium text-base-content/70">
                  {metrics.ownerTransactions} {metrics.ownerTransactions === 1 ? "sale" : "sales"}
                </span>
              </div>
              {metrics.activeEvents > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00E0B8] animate-pulse" />
                  <span className="text-sm font-medium text-[#00E0B8]">{metrics.activeEvents} active</span>
                </div>
              )}
            </>
          )}

          {showOperatorData && (
            <>
              <div className="flex items-center gap-1.5">
                <Store className="w-4 h-4 text-base-content/50" />
                <span className="text-sm font-medium text-base-content/70">
                  {metrics.operatorStallCount} {metrics.operatorStallCount === 1 ? "stall" : "stalls"} operating
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-base-content/50" />
                <span className="text-sm font-medium text-base-content/70">
                  {metrics.operatorTransactions} {metrics.operatorTransactions === 1 ? "sale" : "sales"}
                </span>
              </div>
            </>
          )}
        </motion.div>

        {/* Dual-role summary (show both totals) */}
        {userRole === "dual-role" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 pt-4 border-t border-white/5 flex items-center gap-6"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.owner.primary }} />
              <span className="text-xs text-base-content/50">Events: ${formatCurrency(metrics.totalRevenue)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.operator.primary }} />
              <span className="text-xs text-base-content/50">
                Earnings: ${formatCurrency(metrics.operatorEarnings)}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Compact empty state hero - encourages event creation without competing with Active Stalls
const EmptyStateHero = ({ onCreateEvent }: { onCreateEvent?: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-5 rounded-2xl p-4 relative overflow-hidden border border-white/[0.03]"
      style={{
        background: "linear-gradient(145deg, #161616 0%, #0f0f0f 100%)",
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(at 30% 40%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)",
        }}
      />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-4.5 h-4.5 text-primary/70" />
          </div>
          <div>
            <p className="text-sm font-medium text-base-content/80">Want to host an event?</p>
            <p className="text-xs text-base-content/40">Accept tap-to-pay at your venue</p>
          </div>
        </div>

        {onCreateEvent && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreateEvent}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary/15 hover:bg-primary/25 text-primary rounded-xl text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Event
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export const DashboardHero = ({ mode, metrics, activeContext, hasDualRole, onCreateEvent }: DashboardHeroProps) => {
  if (mode === "empty") {
    return <EmptyStateHero onCreateEvent={onCreateEvent} />;
  }

  return <HeroCard mode={mode} metrics={metrics} activeContext={activeContext} hasDualRole={hasDualRole} />;
};

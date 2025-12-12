"use client";

import { motion } from "framer-motion";
import { CalendarDays, CreditCard, Plus, Store, TrendingUp, Zap } from "lucide-react";
import type { ActiveContext, DashboardMetrics, DashboardMode } from "~~/hooks/useDashboardRealtime";

interface DashboardHeroProps {
  mode: DashboardMode;
  metrics: DashboardMetrics;
  onCreateEvent: () => void;
  activeContext?: ActiveContext;
  hasDualRole?: boolean;
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

// Enhanced Empty state hero with value proposition
const EmptyHero = ({ onCreateEvent }: { onCreateEvent: () => void }) => (
  <div className="flex flex-col min-h-[50vh] items-center justify-center text-center p-6">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="w-full max-w-sm rounded-3xl p-8 relative overflow-hidden border border-white/[0.05]"
      style={{
        background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
      }}
    >
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(at 30% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(at 70% 80%, rgba(242, 169, 0, 0.1) 0%, transparent 50%)",
        }}
      />

      <div className="relative">
        {/* Feature Icons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Store className="w-6 h-6 text-primary" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#00E0B8]/10 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-[#00E0B8]" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-warning" />
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-bold mb-3 text-white"
        >
          Event Payments Made Easy
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base-content/60 mb-6 text-sm"
        >
          Create events, add vendor stalls, and let customers pay with a tap.
        </motion.p>

        {/* Feature List */}
        <motion.ul
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-left text-sm text-base-content/70 space-y-3 mb-8"
        >
          <li className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#00E0B8]" />
            <span>Gasless NFC payments</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#00E0B8]" />
            <span>Instant vendor settlement</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#00E0B8]" />
            <span>Real-time revenue tracking</span>
          </li>
        </motion.ul>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreateEvent}
          className="w-full py-4 bg-primary text-primary-content font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Your First Event
        </motion.button>
      </div>
    </motion.div>
  </div>
);

export const DashboardHero = ({ mode, metrics, onCreateEvent, activeContext, hasDualRole }: DashboardHeroProps) => {
  if (mode === "empty") {
    return <EmptyHero onCreateEvent={onCreateEvent} />;
  }

  return <HeroCard mode={mode} metrics={metrics} activeContext={activeContext} hasDualRole={hasDualRole} />;
};

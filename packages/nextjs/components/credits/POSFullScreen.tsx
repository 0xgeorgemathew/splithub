"use client";

import { useCallback, useEffect, useState } from "react";
import { POSAmountEntry } from "./POSAmountEntry";
import { POSHardwareFrame } from "./POSHardwareFrame";
import { POSReceiptPrinter } from "./POSReceiptPrinter";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Gamepad2, Nfc, Power } from "lucide-react";
import { ActivityDeviceFrame, ActivityReceiptPrinter } from "~~/components/activity";
import { Activity, getAllActivities } from "~~/config/activities";
import { CreditFlowState } from "~~/hooks/credits/useCreditPurchase";
import { useCreditSpend } from "~~/hooks/credits/useCreditSpend";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

// Shared physics configurations
const devicePhysics = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 1.2,
};

// View state for the hub navigation
type ViewState = "pos-active" | "menu-open" | "activity-open";

interface POSFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
  // Amount state
  amount: number;
  onAmountChange: (amount: number) => void;
  // Transaction handlers
  onTap: () => void;
  onReset: () => void;
  // Hook state integration
  flowState: CreditFlowState;
  error?: string;
  txHash?: string | null;
  creditsMinted: string | null;
  newBalance: string | null;
  chainId: number;
}

// Haptic feedback helper
const triggerHaptic = (pattern: number | number[] = 10) => {
  if (typeof window !== "undefined" && window.navigator?.vibrate) {
    window.navigator.vibrate(pattern);
  }
};

// Radial Menu Component
interface RadialMenuProps {
  activities: Activity[];
  onSelectActivity: (activity: Activity) => void;
  onClose: () => void;
}

function RadialMenu({ activities, onSelectActivity, onClose }: RadialMenuProps) {
  // Calculate positions in a semi-circle above the button
  const getPosition = (index: number, total: number) => {
    // Spread activities in a 180° arc (from -90° to +90°, i.e., above the button)
    const startAngle = -Math.PI; // -180° (left)
    const endAngle = 0; // 0° (right)
    const angleStep = (endAngle - startAngle) / (total + 1);
    const angle = startAngle + angleStep * (index + 1);

    const radius = 120; // Distance from center
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    return { x, y };
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="radial-menu-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Menu items */}
      <div className="radial-menu-container">
        {activities.map((activity, index) => {
          const { x, y } = getPosition(index, activities.length);
          const ActivityIcon = activity.icon;
          const colorClass = `radial-menu-item-${activity.color}`;

          return (
            <motion.button
              key={activity.id}
              className={`radial-menu-item ${colorClass}`}
              initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
              animate={{
                scale: 1,
                x,
                y,
                opacity: 1,
              }}
              exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
              transition={{
                ...devicePhysics,
                delay: index * 0.05,
              }}
              onClick={() => onSelectActivity(activity)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
            >
              <ActivityIcon className="w-6 h-6" />
              <span className="radial-menu-item-label">{activity.name}</span>
              <span className="radial-menu-item-credits">{activity.credits} CR</span>
            </motion.button>
          );
        })}

        {/* Center close button */}
        <motion.button
          className="radial-menu-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={devicePhysics}
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Gamepad2 className="w-6 h-6" />
        </motion.button>
      </div>
    </>
  );
}

// Activity Terminal Overlay Component
interface ActivityTerminalProps {
  activity: Activity;
  onClose: () => void;
}

function ActivityTerminal({ activity, onClose }: ActivityTerminalProps) {
  const { targetNetwork } = useTargetNetwork();
  const { flowState, error, txHash, remainingBalance, spendCredits, reset } = useCreditSpend({});

  const handleTap = useCallback(() => {
    if (flowState !== "idle") return;
    spendCredits(activity.credits, activity.id);
  }, [activity, flowState, spendCredits]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const handleDismissAndClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // Determine LED state
  const getLedState = () => {
    if (flowState === "success") return "success";
    if (flowState !== "idle" && flowState !== "error") return "processing";
    if (flowState === "error") return "idle";
    return "ready";
  };

  const ActivityIcon = activity.icon;
  const isIdle = flowState === "idle";
  const showReceipt = flowState !== "idle";

  return (
    <motion.div
      className="activity-terminal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={isIdle ? onClose : undefined}
    >
      {/* Activity Terminal - nested inside backdrop for flexbox centering */}
      <motion.div
        className="activity-terminal-overlay"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={devicePhysics}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Back button */}
        <motion.button
          className="activity-terminal-back-btn"
          onClick={onClose}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK</span>
        </motion.button>

        <ActivityDeviceFrame ledState={getLedState()} onClose={onClose}>
          {showReceipt ? (
            <ActivityReceiptPrinter
              flowState={flowState}
              activity={activity}
              txHash={txHash}
              chainId={targetNetwork.id}
              remainingBalance={remainingBalance}
              error={error}
              onRetry={handleReset}
              onDismiss={handleDismissAndClose}
            />
          ) : (
            <>
              {/* Activity Info */}
              <div className="activity-info-display">
                <div className="activity-info-icon">
                  <ActivityIcon className="w-8 h-8" />
                </div>
                <div className="activity-info-name">{activity.name}</div>
                <div className="activity-info-cost">{activity.credits} CREDITS</div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="activity-error-display">
                  <AlertCircle className="w-4 h-4" />
                  <span className="activity-error-text">{error}</span>
                </div>
              )}

              {/* Tap Button */}
              <button onClick={handleTap} disabled={!isIdle} className="activity-tap-btn">
                <div className="activity-tap-btn-content">
                  <Nfc className="w-8 h-8 activity-tap-btn-icon" />
                  <span className="activity-tap-btn-text">TAP TO ACCESS</span>
                  <span className="activity-tap-btn-subtext">DEDUCTS {activity.credits} CR</span>
                </div>
              </button>
            </>
          )}
        </ActivityDeviceFrame>
      </motion.div>
    </motion.div>
  );
}

export function POSFullScreen({
  isOpen,
  onClose,
  amount,
  onAmountChange,
  onTap,
  onReset,
  flowState,
  error,
  txHash,
  creditsMinted,
  newBalance,
  chainId,
}: POSFullScreenProps) {
  const [prevFlowState, setPrevFlowState] = useState<CreditFlowState>("idle");
  const [viewState, setViewState] = useState<ViewState>("pos-active");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const activities = getAllActivities();
  const isProcessing = flowState !== "idle" && flowState !== "error";
  const isIdle = flowState === "idle" || flowState === "error";

  // Haptic feedback on state changes
  useEffect(() => {
    if (flowState !== prevFlowState) {
      if (flowState === "submitting") {
        triggerHaptic(10);
      } else if (flowState === "confirming") {
        triggerHaptic(15);
      } else if (flowState === "success") {
        triggerHaptic([10, 50, 10, 50, 10]);
      }
      setPrevFlowState(flowState);
    }
  }, [flowState, prevFlowState]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  // Reset view state when closing
  useEffect(() => {
    if (!isOpen) {
      setViewState("pos-active");
      setSelectedActivity(null);
    }
  }, [isOpen]);

  const handleTap = useCallback(() => {
    if (isProcessing) return;
    triggerHaptic(10);
    onTap();
  }, [isProcessing, onTap]);

  const handleRetry = useCallback(() => {
    onReset();
  }, [onReset]);

  const handleDismiss = useCallback(() => {
    triggerHaptic(10);
    onReset();
    onClose();
  }, [onReset, onClose]);

  const handleOpenMenu = useCallback(() => {
    triggerHaptic(10);
    setViewState("menu-open");
  }, []);

  const handleCloseMenu = useCallback(() => {
    triggerHaptic(10);
    setViewState("pos-active");
  }, []);

  const handleSelectActivity = useCallback((activity: Activity) => {
    triggerHaptic(10);
    setSelectedActivity(activity);
    setViewState("activity-open");
  }, []);

  const handleCloseActivity = useCallback(() => {
    triggerHaptic(10);
    setViewState("menu-open");
    setSelectedActivity(null);
  }, []);

  const isPOSBlurred = viewState !== "pos-active";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="pos-fullscreen"
          role="dialog"
          aria-modal="true"
          aria-label="Payment Terminal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Dark backdrop - clicking closes when idle and POS is active */}
          {isIdle && !isProcessing && viewState === "pos-active" && (
            <button className="absolute inset-0 z-0" onClick={handleDismiss} aria-label="Close terminal" />
          )}

          {/* Main POS Container with blur effect */}
          <motion.div
            className="pos-terminal-wrapper"
            initial={{ y: "100%", opacity: 0, scale: 0.9 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: isPOSBlurred ? 0.95 : 1,
              filter: isPOSBlurred ? "blur(8px)" : "blur(0px)",
            }}
            exit={{ y: "20%", opacity: 0 }}
            transition={devicePhysics}
          >
            {/* Power Off Button */}
            <motion.button
              className="pos-power-btn"
              onClick={handleDismiss}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Close terminal"
            >
              <Power className="w-5 h-5" />
            </motion.button>

            {/* Hardware Frame - now receives flowState for LED and shake animations */}
            <POSHardwareFrame flowState={flowState}>
              <AnimatePresence mode="wait">
                {isIdle ? (
                  <motion.div
                    key="amount-entry"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <POSAmountEntry
                      amount={amount}
                      onAmountChange={onAmountChange}
                      onSubmit={handleTap}
                      disabled={isProcessing}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="receipt-printer"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <POSReceiptPrinter
                      flowState={flowState}
                      txHash={txHash || null}
                      chainId={chainId}
                      creditsMinted={creditsMinted}
                      newBalance={newBalance}
                      amount={amount}
                      error={error || null}
                      onRetry={handleRetry}
                      onDismiss={handleDismiss}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </POSHardwareFrame>

            {/* Activities Navigation Button - Below Terminal */}
            <motion.button
              className="activities-nav-btn-inline"
              onClick={handleOpenMenu}
              aria-label="View Activities"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Gamepad2 className="w-6 h-6" />
            </motion.button>
          </motion.div>

          {/* Radial Menu Overlay */}
          <AnimatePresence>
            {viewState === "menu-open" && (
              <RadialMenu activities={activities} onSelectActivity={handleSelectActivity} onClose={handleCloseMenu} />
            )}
          </AnimatePresence>

          {/* Activity Terminal Overlay */}
          <AnimatePresence>
            {viewState === "activity-open" && selectedActivity && (
              <ActivityTerminal activity={selectedActivity} onClose={handleCloseActivity} />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

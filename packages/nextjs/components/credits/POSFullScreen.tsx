"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityPanel } from "./ActivityPanel";
import { POSAmountEntry } from "./POSAmountEntry";
import { POSCardStack } from "./POSCardStack";
import { POSHardwareFrame } from "./POSHardwareFrame";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Activity } from "~~/config/activities";
import { CreditFlowState } from "~~/hooks/credits/useCreditPurchase";

type ViewMode = "purchase" | "purchasing" | "activity";

// Smooth easing curve optimized for 120fps displays
// Using tween with custom bezier for buttery smooth motion
const smoothEase = [0.32, 0.72, 0, 1] as const; // Custom ease-out curve

// Transition for view changes - tween for consistent smoothness
const viewTransition = {
  type: "tween" as const,
  duration: 0.35,
  ease: smoothEase,
};

// Smooth spring for main terminal entry/exit
const terminalTransition = {
  type: "tween" as const,
  duration: 0.5,
  ease: smoothEase,
};

// Scale variants for purchase <-> purchasing transitions
const scaleVariants = {
  enter: { opacity: 0, scale: 1.05 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Slide variants for activity transitions (directional)
const slideLeftVariants = {
  enter: { opacity: 0, scale: 0.95, x: 30 },
  center: { opacity: 1, scale: 1, x: 0 },
  exit: { opacity: 0, scale: 0.95, x: -30 },
};

const slideRightVariants = {
  enter: { opacity: 0, scale: 0.95, x: -30 },
  center: { opacity: 1, scale: 1, x: 0 },
  exit: { opacity: 0, scale: 0.95, x: 30 },
};

interface POSFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onAmountChange: (amount: number) => void;
  onTap: () => void;
  onReset: () => void;
  flowState: CreditFlowState;
  error?: string;
  txHash?: string | null;
  creditsMinted: string | null;
  newBalance: string | null;
  chainId: number;
  activities?: Activity[];
  onSelectActivity?: (activity: Activity) => void;
  selectedActivity?: Activity | null;
  onActivityBack?: () => void;
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
  activities,
  onSelectActivity,
  selectedActivity,
  onActivityBack,
}: POSFullScreenProps) {
  // Track previous mode for directional animations
  const prevModeRef = useRef<ViewMode>("purchase");

  // Track activity flow state for LED synchronization
  const [activityFlowState, setActivityFlowState] = useState<CreditFlowState>("idle");

  const handleActivityFlowStateChange = useCallback((state: CreditFlowState) => {
    setActivityFlowState(state);
  }, []);

  // Derive current view mode
  const getViewMode = (): ViewMode => {
    if (selectedActivity) return "activity";
    if (flowState !== "idle") return "purchasing";
    return "purchase";
  };

  const viewMode = getViewMode();

  // Determine animation direction based on mode transition
  const getVariants = () => {
    const prevMode = prevModeRef.current;

    // Activity transitions use slide animations
    if (viewMode === "activity" && prevMode !== "activity") {
      // Entering activity: slide from right
      return slideLeftVariants;
    }
    if (viewMode !== "activity" && prevMode === "activity") {
      // Leaving activity: slide from left
      return slideRightVariants;
    }

    // Purchase <-> Purchasing use scale animations
    return scaleVariants;
  };

  // Update previous mode after render
  useEffect(() => {
    prevModeRef.current = viewMode;
  }, [viewMode]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const handleTap = useCallback(() => {
    if (flowState !== "idle") return;
    onTap();
  }, [flowState, onTap]);

  const handleDismiss = useCallback(() => {
    onReset();
    onClose();
  }, [onReset, onClose]);

  return (
    <motion.div
      className="pos-fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label="Payment Terminal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: smoothEase }}
    >
      {/* Backdrop - always clickable to dismiss */}
      <button className="absolute inset-0 z-0" onClick={handleDismiss} aria-label="Close terminal" />

      {/* Main POS Container */}
      <motion.div
        className="pos-terminal-wrapper"
        initial={{ y: "100%", opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "100%", opacity: 0, scale: 0.95 }}
        transition={terminalTransition}
      >
        <POSHardwareFrame
          flowState={flowState}
          onClose={handleDismiss}
          activities={activities}
          onSelectActivity={onSelectActivity}
          selectedActivity={selectedActivity}
          activityFlowState={viewMode === "activity" ? activityFlowState : undefined}
          onActivityBack={onActivityBack}
        >
          <LayoutGroup>
            <AnimatePresence mode="wait">
              {viewMode === "purchase" && (
                <motion.div
                  key="amount-entry"
                  className="w-full h-full"
                  variants={getVariants()}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={viewTransition}
                >
                  <POSAmountEntry
                    amount={amount}
                    onAmountChange={onAmountChange}
                    onSubmit={handleTap}
                    disabled={false}
                  />
                </motion.div>
              )}
              {viewMode === "purchasing" && (
                <motion.div
                  key="card-stack"
                  className="flex items-center justify-center p-4 w-full h-full"
                  variants={getVariants()}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={viewTransition}
                >
                  <POSCardStack
                    flowState={flowState}
                    amount={amount}
                    creditsMinted={creditsMinted}
                    newBalance={newBalance}
                    error={error}
                    txHash={txHash}
                    chainId={chainId}
                    onRetry={onReset}
                    onDismiss={handleDismiss}
                  />
                </motion.div>
              )}
              {viewMode === "activity" && selectedActivity && (
                <motion.div
                  key="activity-panel"
                  className="w-full h-full"
                  variants={getVariants()}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={viewTransition}
                >
                  <ActivityPanel
                    activity={selectedActivity}
                    onBack={onActivityBack ?? (() => {})}
                    chainId={chainId}
                    onFlowStateChange={handleActivityFlowStateChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
        </POSHardwareFrame>
      </motion.div>
    </motion.div>
  );
}

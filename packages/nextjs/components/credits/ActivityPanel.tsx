"use client";

import { useCallback, useEffect } from "react";
import { ActivityCardStack } from "./ActivityCardStack";
import { AnimatePresence, motion } from "framer-motion";
import { Nfc } from "lucide-react";
import { Activity } from "~~/config/activities";
import { useCreditSpend } from "~~/hooks/credits";
import { CreditFlowState } from "~~/hooks/credits/useCreditSpend";

interface ActivityPanelProps {
  activity: Activity;
  onBack: () => void;
  chainId: number;
  /** Reports flow state changes to parent for LED synchronization */
  onFlowStateChange?: (flowState: CreditFlowState) => void;
}

// View transition for idle <-> transaction
const viewTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

const viewVariants = {
  enter: { opacity: 0, scale: 1.05 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export function ActivityPanel({ activity, onBack, chainId, onFlowStateChange }: ActivityPanelProps) {
  const { flowState, error, txHash, remainingBalance, spendCredits, reset } = useCreditSpend({});

  // Report flow state changes to parent
  useEffect(() => {
    onFlowStateChange?.(flowState);
  }, [flowState, onFlowStateChange]);

  const handleTap = useCallback(() => {
    if (flowState !== "idle") return;
    spendCredits(activity.credits, activity.id);
  }, [activity, flowState, spendCredits]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const handleDismiss = useCallback(() => {
    reset();
    onBack();
  }, [reset, onBack]);

  const isIdle = flowState === "idle";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <AnimatePresence mode="wait">
        {isIdle ? (
          <motion.div
            key="idle-view"
            className="pos-amount-entry"
            variants={viewVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={viewTransition}
          >
            {/* Simple Activity Header - Name only, glassmorphic style */}
            <motion.div
              className="w-full mb-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div
                className="text-center py-2 px-4 rounded-xl"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div className="text-[10px] text-gray-500 uppercase tracking-wider leading-none mb-1">Activity</div>
                <div className="text-base font-bold text-white">{activity.name}</div>
              </div>
            </motion.div>

            {/* Main Amount Display - Shows credits being spent */}
            <motion.div
              className="pos-amount-display"
              layout
              initial={{ scale: 0.98, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <div className="pos-amount-label">SPEND</div>
              <div className="pos-amount-value">
                <span className="pos-currency">-</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={activity.credits}
                    className="pos-amount-number"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {activity.credits}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="pos-amount-token">CREDITS</div>
            </motion.div>

            {/* Info Row - Session type */}
            <motion.div
              className="pos-credits-preview"
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, layout: { type: "spring", stiffness: 300, damping: 30 } }}
            >
              <div className="pos-preview-row pos-preview-row-centered">
                <span className="pos-preview-label">ACCESS</span>
                <motion.span
                  className="pos-preview-value"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  1 SESSION
                </motion.span>
              </div>
            </motion.div>

            {/* Tap to Access Button */}
            <motion.div
              className="pos-tap-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 25 }}
            >
              <motion.button
                onClick={handleTap}
                className="pos-tap-pay-btn"
                aria-label="Tap to access"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.95, y: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div className="pos-tap-icon-wrapper">
                  <Nfc className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <span className="pos-tap-text">TAP TO ACCESS</span>
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="transaction-view"
            className="w-full px-4"
            variants={viewVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={viewTransition}
          >
            <ActivityCardStack
              flowState={flowState}
              activityName={activity.name}
              activityIcon={activity.icon}
              creditsAmount={activity.credits}
              remainingBalance={remainingBalance}
              error={error}
              txHash={txHash}
              chainId={chainId}
              onRetry={handleReset}
              onDismiss={handleDismiss}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

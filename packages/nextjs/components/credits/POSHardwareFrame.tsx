"use client";

import { ReactNode, useEffect, useState } from "react";
import { LedState, POSLed } from "./POSLed";
import { motion, useAnimationControls } from "framer-motion";
import { Gamepad2, Power } from "lucide-react";
import { Activity } from "~~/config/activities";
import { SHAKE_ANIMATION, SHAKE_TRANSITION } from "~~/constants/app.constants";
import { CreditFlowState } from "~~/hooks/credits/useCreditPurchase";

interface POSHardwareFrameProps {
  children: ReactNode;
  flowState: CreditFlowState;
  onClose?: () => void;
  activities?: Activity[];
  onSelectActivity?: (activity: Activity) => void;
  /** Currently selected activity - used to highlight in capsule */
  selectedActivity?: Activity | null;
  /** When in activity mode, this flow state controls the LED */
  activityFlowState?: CreditFlowState;
  /** Called when user wants to go back from activity mode to purchase mode */
  onActivityBack?: () => void;
}

// Map flow state to LED state
function mapToLedState(flowState: CreditFlowState): LedState {
  switch (flowState) {
    case "tapping":
    case "signing":
    case "preparing":
    case "confirming_signature":
    case "submitting":
    case "confirming":
      return "processing";
    case "success":
      return "success";
    case "error":
      return "error";
    case "idle":
    default:
      return "idle";
  }
}

// Shared spring config for ALL animations - ensures symmetry
const springConfig = {
  type: "spring" as const,
  stiffness: 350,
  damping: 30,
};

// Capsule container variants - simple width expansion/contraction
// Activity icons are already in place, just revealed by the expanding capsule
const capsuleVariants = {
  closed: {
    width: 52, // Closed = circle size
    borderRadius: 26,
    transition: springConfig,
  },
  open: {
    width: "auto",
    borderRadius: 26,
    transition: springConfig,
  },
};

// Icon rotation variants
const iconRotationVariants = {
  closed: {
    rotate: 0,
    transition: springConfig,
  },
  open: {
    rotate: 90,
    transition: springConfig,
  },
};

export function POSHardwareFrame({
  children,
  flowState,
  onClose,
  activities,
  onSelectActivity,
  selectedActivity,
  activityFlowState,
  onActivityBack,
}: POSHardwareFrameProps) {
  const controls = useAnimationControls();
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);

  // Use activity flow state for LED when in activity mode, otherwise purchase flow state
  const effectiveFlowState = activityFlowState ?? flowState;
  const ledState = mapToLedState(effectiveFlowState);

  // Only block during active transactions (tapping, signing, submitting, confirming)
  // Allow interaction during idle, success, and error states
  const activeTransactionStates = [
    "tapping",
    "signing",
    "preparing",
    "confirming_signature",
    "submitting",
    "confirming",
  ];
  const isPurchaseTransactionInProgress = activeTransactionStates.includes(flowState);
  const isActivityTransactionInProgress =
    activityFlowState !== undefined && activeTransactionStates.includes(activityFlowState);
  const isTransactionInProgress = isPurchaseTransactionInProgress || isActivityTransactionInProgress;

  // Activity mode is when an activity is selected
  const isActivityMode = selectedActivity !== null && selectedActivity !== undefined;

  const handleToggleGameMenu = () => {
    if (isTransactionInProgress) return;

    // If in activity mode, tapping the game icon should go back to POS
    // This works whether the menu is open or closed
    if (isActivityMode) {
      setIsGameMenuOpen(false); // Ensure menu is closed
      onActivityBack?.();
      return;
    }

    // Otherwise, toggle the menu open/closed
    setIsGameMenuOpen(prev => !prev);
  };

  const handleSelectActivity = (activity: Activity) => {
    // Don't close the menu, just select the activity
    // This keeps the capsule expanded so user can see the selection
    onSelectActivity?.(activity);
  };

  // Trigger shake animation on error
  useEffect(() => {
    if (flowState === "error") {
      controls.start({
        ...SHAKE_ANIMATION,
        transition: SHAKE_TRANSITION,
      });
    }
  }, [flowState, controls]);

  // Track mouse position for glass reflection effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePosition({ x, y });
  };

  return (
    <motion.div className="pos-hardware-frame" animate={controls} onMouseMove={handleMouseMove}>
      {/* Glass finish overlay - subtle gradient across entire frame */}
      <div
        className="absolute inset-0 pointer-events-none z-50 rounded-[2.5rem]"
        style={{
          background: "linear-gradient(to top right, rgba(255, 255, 255, 0.03) 0%, transparent 60%)",
        }}
      />

      {/* Top speaker grille */}
      <div className="pos-speaker-grille">
        <div className="pos-speaker-slot" />
        <div className="pos-speaker-slot" />
        <div className="pos-speaker-slot" />
      </div>

      {/* Status LED - using Framer Motion component */}
      <div className="pos-led-container">
        <POSLed state={ledState} />
      </div>

      {/* Main screen area */}
      <div className="pos-screen">
        {/* Screen bezel highlight */}
        <div className="pos-screen-bezel" />

        {/* Glass reflection effect - parallax based on mouse */}
        <motion.div
          className="pos-screen-reflection"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
            borderRadius: "inherit",
            background: `linear-gradient(
              ${135 + (mousePosition.x - 0.5) * 30}deg,
              rgba(255, 255, 255, 0.08) 0%,
              rgba(255, 255, 255, 0.02) 30%,
              transparent 50%,
              rgba(255, 255, 255, 0.01) 80%,
              rgba(255, 255, 255, 0.04) 100%
            )`,
          }}
          animate={{
            background: `linear-gradient(
              ${135 + (mousePosition.x - 0.5) * 30}deg,
              rgba(255, 255, 255, 0.08) 0%,
              rgba(255, 255, 255, 0.02) 30%,
              transparent 50%,
              rgba(255, 255, 255, 0.01) 80%,
              rgba(255, 255, 255, 0.04) 100%
            )`,
          }}
          transition={{ duration: 0.1 }}
        />

        {/* Content area - animations handled by parent component */}
        <div className="pos-screen-content">{children}</div>
      </div>

      {/* Bottom branding area */}
      <div className="pos-branding">
        <span className="pos-brand-text">SPLITHUB</span>
        <div className="pos-brand-accent" />
      </div>

      {/* Card slot indicator with inner shadow for receipt emergence */}
      <div className="pos-card-slot">
        <div
          className="pos-card-slot-inner"
          style={{
            boxShadow: "inset 0 4px 8px rgba(0, 0, 0, 0.6)",
          }}
        />
      </div>

      {/* Hardware Control Bar (Chin) */}
      <div className="pos-hardware-chin">
        {/* Unified Game Capsule - expands from circle to pill seamlessly */}
        {/* Show capsule when activities available */}
        {activities && activities.length > 0 && (
          <motion.div
            className={`pos-chin-capsule ${isGameMenuOpen ? "pos-chin-capsule-expanded" : ""}`}
            variants={capsuleVariants}
            initial="closed"
            animate={isGameMenuOpen ? "open" : "closed"}
          >
            {/* Game Icon Toggle - always visible as left cap */}
            <motion.button
              className={`pos-capsule-toggle ${isTransactionInProgress ? "opacity-40 cursor-not-allowed" : ""}`}
              onClick={handleToggleGameMenu}
              whileTap={isTransactionInProgress ? undefined : { scale: 0.92 }}
              aria-label={isGameMenuOpen ? "Close activities menu" : "Open activities menu"}
              aria-expanded={isGameMenuOpen}
              aria-disabled={isTransactionInProgress}
            >
              <motion.div
                variants={iconRotationVariants}
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Gamepad2 />
              </motion.div>
            </motion.button>

            {/* Activity buttons - static, revealed by capsule expansion */}
            <div className="pos-capsule-activities">
              {activities.map(activity => {
                const ActivityIcon = activity.icon;
                const isSelected = selectedActivity?.id === activity.id;
                return (
                  <motion.button
                    key={activity.id}
                    className={`pos-chin-activity-btn pos-chin-activity-${activity.color} ${isSelected ? "pos-chin-activity-selected" : ""}`}
                    onClick={() => handleSelectActivity(activity)}
                    disabled={isTransactionInProgress}
                    whileTap={isTransactionInProgress ? undefined : { scale: 0.95 }}
                  >
                    <ActivityIcon className="w-4 h-4" />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Power Button - Right (absolutely positioned) */}
        {onClose && (
          <motion.button
            className="pos-chin-btn pos-chin-btn-power"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Close terminal"
          >
            <Power className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

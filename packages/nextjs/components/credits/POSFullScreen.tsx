"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityPanel } from "./ActivityPanel";
import { POSAmountEntry } from "./POSAmountEntry";
import { POSCardStack } from "./POSCardStack";
import { usePOS } from "./POSContext";
import { POSHardwareFrame } from "./POSHardwareFrame";
import { AnimatePresence, LayoutGroup, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import {
  HAPTIC_BLOCKED_DISMISSAL,
  SCALE_VARIANTS,
  SHAKE_ANIMATION,
  SHAKE_TRANSITION,
  SLIDE_VARIANTS,
  SPRING_CONFIGS,
  TWEEN_CONFIGS,
} from "~~/constants/app.constants";
import { CreditFlowState } from "~~/hooks/credits/useCreditPurchase";

/**
 * POS Terminal View Modes
 *
 * The terminal has three distinct view modes with specific animation transitions:
 *
 * VIEW TRANSITION TABLE:
 * ─────────────────────────────────────────────────────────────────────────
 * From          -> To            | Animation      | Direction
 * ─────────────────────────────────────────────────────────────────────────
 * purchase      -> purchasing    | scale          | forward (grow)
 * purchasing    -> purchase      | scale          | backward (shrink)
 * purchase      -> activity      | slide          | left (enter from right)
 * purchasing    -> activity      | slide          | left (enter from right)
 * activity      -> purchase      | slide          | right (exit to right)
 * activity      -> purchasing    | slide          | right (exit to right)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * NOTE: Both purchase and purchasing modes are treated identically when
 * transitioning to/from activity view. The implementation uses a simplified
 * check: "is current mode activity?" rather than distinguishing between
 * purchase and purchasing states for slide animations.
 *
 * ANIMATION RATIONALE:
 * - Scale animations: Used for purchase<->purchasing because they represent
 *   depth (going deeper into a transaction flow)
 * - Slide animations: Used for activity panel because it represents lateral
 *   navigation (viewing past transactions)
 */
type ViewMode = "purchase" | "purchasing" | "activity";

/**
 * POS Terminal Full Screen Component
 *
 * Renders the point-of-sale terminal interface.
 * Must be wrapped in POSProvider to access state via usePOS() hook.
 *
 * @example
 * ```tsx
 * <POSProvider chainId={84532} activities={activities} onClose={handleClose}>
 *   <POSFullScreen />
 * </POSProvider>
 * ```
 */
export function POSFullScreen() {
  // Access all state and actions from POSContext
  const {
    isOpen,
    close,
    amount,
    setAmount,
    purchaseCredits,
    reset,
    flowState,
    error,
    txHash,
    creditsMinted,
    newBalance,
    chainId,
    activities,
    selectActivity,
    selectedActivity,
    clearActivity,
    isProcessing,
  } = usePOS();

  /**
   * Track previous mode for directional animations.
   *
   * ARCHITECTURAL NOTE: This ref pattern is used instead of explicit state
   * because animation direction is a derived value needed only during render.
   * The pattern avoids re-renders while providing animation direction context.
   *
   * Flow: Read prevModeRef in getVariants() → Update prevModeRef in useEffect
   * This ensures getVariants() sees the OLD value while computing transitions,
   * and the ref is updated AFTER render for the next transition.
   *
   * FUTURE CONSIDERATION: Could migrate to useStateMachine with transition
   * tracking for explicit state machine benefits, but current pattern works
   * well for this isolated use case.
   */
  const prevModeRef = useRef<ViewMode>("purchase");

  // Track activity flow state for LED synchronization
  const [activityFlowState, setActivityFlowState] = useState<CreditFlowState>("idle");

  const handleActivityFlowStateChange = useCallback((state: CreditFlowState) => {
    setActivityFlowState(state);
  }, []);

  /**
   * Handles returning from activity view.
   * Resets activityFlowState to prevent stale LED states when
   * switching back to purchase/purchasing view.
   */
  const handleActivityBack = useCallback(() => {
    setActivityFlowState("idle");
    clearActivity();
  }, [clearActivity]);

  // Animation controls for blocked dismissal feedback
  const shakeControls = useAnimationControls();

  // Haptic feedback for blocked dismissal
  const triggerHaptic = useCallback((pattern: number | number[] = 50) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Derive current view mode
  const getViewMode = (): ViewMode => {
    if (selectedActivity) return "activity";
    if (flowState !== "idle") return "purchasing";
    return "purchase";
  };

  const viewMode = getViewMode();

  /**
   * Determines animation variants based on the current mode transition.
   *
   * Uses ref to track previous mode for directional awareness:
   * - prevModeRef.current: The mode we're transitioning FROM
   * - viewMode: The mode we're transitioning TO
   *
   * @returns Animation variants object for Framer Motion
   */
  const getVariants = () => {
    const prevMode = prevModeRef.current;

    // Activity transitions use slide animations
    if (viewMode === "activity" && prevMode !== "activity") {
      // Entering activity: slide from right (content moves left)
      return SLIDE_VARIANTS.left;
    }
    if (viewMode !== "activity" && prevMode === "activity") {
      // Leaving activity: slide to right (content moves right)
      return SLIDE_VARIANTS.right;
    }

    // Purchase <-> Purchasing use scale animations (depth metaphor)
    return SCALE_VARIANTS;
  };

  /**
   * SIDE EFFECT: Updates previous mode reference after each render.
   *
   * This enables directional animation awareness - we need to know
   * WHERE we came from to determine animation direction.
   *
   * Timing: Runs after render completes, so getVariants() can still
   * access the previous value during the current render cycle.
   */
  useEffect(() => {
    prevModeRef.current = viewMode;
  }, [viewMode]);

  /**
   * SIDE EFFECT: Locks body scroll when terminal is open.
   *
   * Prevents background page scrolling while the fullscreen modal is active.
   * Cleanup function restores scroll on unmount or when terminal closes.
   */
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
    purchaseCredits();
  }, [flowState, purchaseCredits]);

  /**
   * Handles terminal dismissal (backdrop click or close button).
   *
   * GUARD: Prevents dismissal during active transaction to avoid orphaning
   * in-progress transactions where reset() silently fails but close() still
   * executes, hiding the transaction UI.
   *
   * FEEDBACK: Provides visual (shake) + haptic feedback when dismissal is blocked
   * to communicate that an action is in progress.
   */
  const handleDismiss = useCallback(() => {
    if (isProcessing) {
      // Transaction in progress - provide feedback and block dismissal
      triggerHaptic([...HAPTIC_BLOCKED_DISMISSAL]);
      shakeControls.start({
        ...SHAKE_ANIMATION,
        transition: SHAKE_TRANSITION,
      });
      return;
    }
    reset();
    close();
  }, [reset, close, isProcessing, triggerHaptic, shakeControls]);

  /**
   * REDUCED MOTION HANDLING:
   *
   * Terminal entrance animation (slide-up):
   * - RESPECTS preference: Slide-up is a structural/spatial transition that
   *   can trigger vestibular issues for users with motion sensitivity
   *
   * Internal view transitions (purchase/purchasing/activity):
   * - ALWAYS ANIMATES: Content swaps within the terminal are primarily
   *   opacity-based and less likely to cause accessibility issues
   * - Rationale: These animations are subtle and provide important state
   *   feedback about which view is active
   *
   * This intentional difference balances accessibility with UX clarity.
   */
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="pos-fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label="Payment Terminal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TWEEN_CONFIGS.backdrop}
    >
      {/* Backdrop - always clickable to dismiss */}
      <motion.button
        className="absolute inset-0 z-0"
        onClick={handleDismiss}
        aria-label="Close terminal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={TWEEN_CONFIGS.backdrop}
      />

      {/* Shake wrapper for blocked dismissal feedback */}
      <motion.div animate={shakeControls}>
        {/* Main POS Container - GPU accelerated spring animation */}
        <motion.div
          className="pos-terminal-wrapper"
          style={{
            // Force GPU layer for buttery smooth animation
            transform: "translateZ(0)",
          }}
          initial={{
            y: prefersReducedMotion ? 0 : "100vh",
            opacity: prefersReducedMotion ? 0 : 1,
          }}
          animate={{
            y: 0,
            opacity: 1,
          }}
          exit={{
            y: prefersReducedMotion ? 0 : "100vh",
            opacity: prefersReducedMotion ? 0 : 1,
          }}
          transition={SPRING_CONFIGS.terminal}
        >
          <POSHardwareFrame
            flowState={flowState}
            onClose={handleDismiss}
            activities={activities}
            onSelectActivity={selectActivity}
            selectedActivity={selectedActivity}
            activityFlowState={viewMode === "activity" ? activityFlowState : undefined}
            onActivityBack={handleActivityBack}
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
                    transition={SPRING_CONFIGS.view}
                  >
                    <POSAmountEntry amount={amount} onAmountChange={setAmount} onSubmit={handleTap} disabled={false} />
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
                    transition={SPRING_CONFIGS.view}
                  >
                    <POSCardStack
                      flowState={flowState}
                      amount={amount}
                      creditsMinted={creditsMinted}
                      newBalance={newBalance}
                      error={error}
                      txHash={txHash}
                      chainId={chainId}
                      onRetry={reset}
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
                    transition={SPRING_CONFIGS.view}
                  >
                    <ActivityPanel
                      activity={selectedActivity}
                      onBack={handleActivityBack}
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
    </motion.div>
  );
}

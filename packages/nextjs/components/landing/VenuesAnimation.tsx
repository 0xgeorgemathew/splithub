"use client";

import { useEffect, useRef, useState } from "react";
import { WristbandIcon } from "./WristbandIcon";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Circle, Crosshair, Gamepad2, Target } from "lucide-react";

// Animation phases
type Phase =
  | "mining" // Credits accumulating from USDC
  | "loaded" // Brief glow to indicate full credits
  | "idle" // Centered game icon, waiting
  | "expanded" // Activity icons expand outward
  | "select-1" // First activity selected
  | "select-2" // Second activity selected
  | "select-3" // Third activity selected
  | "complete" // All activities done, shows centered game icon
  | "reset"; // Brief reset before loop, also shows centered game icon

// Timing constants (ms) - centralized for easy tuning
const TIMING = {
  BURN_DELAY: 150, // Delay before burn starts
  BURN_DURATION: 1200, // How long burn animation shows
  CREDIT_COUNTDOWN_DURATION: 900, // How long credits count down
  MINING_DURATION: 2500, // How long mining phase lasts
  SELECTION_PHASE_DURATION: 2000, // Duration of each selection phase
  SELECTION_START_DELAY: 300, // Delay before selection starts within phase
};

// Initial credits after mining
const INITIAL_CREDITS = 100;

// Activities with lucide-react icons and costs
const activities = [
  {
    Icon: Circle,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    glowColor: "rgba(34, 211, 238, 0.5)",
    cost: 30,
  },
  {
    Icon: Crosshair,
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    glowColor: "rgba(248, 113, 113, 0.5)",
    cost: 40,
  },
  {
    Icon: Target,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    glowColor: "rgba(251, 146, 60, 0.5)",
    cost: 30,
  },
];

// Precompute cumulative costs for each selection phase
const selectionTargets = activities.reduce<{ targetCredits: number; completedList: number[] }[]>((acc, _, index) => {
  const previousCredits = index === 0 ? INITIAL_CREDITS : acc[index - 1].targetCredits;
  const targetCredits = previousCredits - activities[index].cost;
  const completedList = [...Array(index + 1).keys()]; // [0], [0,1], [0,1,2]
  acc.push({ targetCredits, completedList });
  return acc;
}, []);

// USDC Coin component - single drop animation per coin
function USDCCoin({ index, prefersReducedMotion }: { index: number; prefersReducedMotion: boolean }) {
  if (prefersReducedMotion) {
    return (
      <div className="w-7 h-7 rounded-full bg-[#2775CA] flex items-center justify-center shadow-lg relative opacity-80">
        <span className="text-white text-xs font-bold z-10">$</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.8 }}
      animate={{
        opacity: [0, 1, 1, 0.8, 0],
        y: [-20, 0, 30, 50, 65],
        scale: [0.8, 1, 1, 0.8, 0.4],
      }}
      exit={{ opacity: 0, scale: 0.3, transition: { duration: 0.2 } }}
      transition={{
        duration: 2.2,
        delay: index * 0.35,
        repeat: Infinity,
        repeatDelay: 0.3,
        ease: [0.22, 1, 0.36, 1], // Smooth easeOutExpo
      }}
      className="w-7 h-7 rounded-full bg-[#2775CA] flex items-center justify-center shadow-lg relative"
    >
      <span className="text-white text-xs font-bold z-10">$</span>
      <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-2 h-1 bg-white rounded-b-full opacity-90" />
      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-1 bg-white rounded-t-full opacity-90" />
      <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-1 h-2 bg-white rounded-r-full opacity-90" />
      <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-2 bg-white rounded-l-full opacity-90" />
    </motion.div>
  );
}

export function VenuesAnimation() {
  const [phase, setPhase] = useState<Phase>("mining");
  const [credits, setCredits] = useState(0);
  const [showBurn, setShowBurn] = useState(false);
  const [pendingDeduction, setPendingDeduction] = useState<number | null>(null);
  const [completedActivities, setCompletedActivities] = useState<number[]>([]);
  const [activeActivity, setActiveActivity] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const countIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]); // Track all timeouts for cleanup
  const creditsRef = useRef(0); // Track current credits for countdown

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  // Helper to create tracked timeouts
  const createTimeout = (callback: () => void, delay: number) => {
    const id = setTimeout(callback, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  // Clear all tracked timeouts
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const clearCountInterval = () => {
    if (countIntervalRef.current) {
      clearInterval(countIntervalRef.current);
      countIntervalRef.current = null;
    }
  };

  useEffect(() => {
    // Animated credit countdown - defined inside useEffect to avoid stale closures
    const animateCreditsTo = (targetCredits: number, duration: number) => {
      const startCredits = creditsRef.current;
      const diff = startCredits - targetCredits;
      const steps = Math.max(diff, 10); // At least 10 steps for smoothness
      const stepDuration = duration / steps;
      let currentStep = 0;

      clearCountInterval();
      countIntervalRef.current = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        // Ease-out curve for natural deceleration
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const newCredits = Math.round(startCredits - diff * easedProgress);

        creditsRef.current = newCredits;
        setCredits(newCredits);

        if (currentStep >= steps) {
          creditsRef.current = targetCredits;
          setCredits(targetCredits);
          clearCountInterval();
        }
      }, stepDuration);
    };

    // Handle selection phase with smooth burn animation
    const handleSelection = (activityIndex: number, targetCredits: number, completedList: number[]) => {
      setActiveActivity(activityIndex);
      const cost = activities[activityIndex].cost;

      // Start burn and deduction together after brief delay
      createTimeout(() => {
        setPendingDeduction(cost);
        setShowBurn(true);

        // Start credit countdown shortly after burn begins
        createTimeout(() => {
          animateCreditsTo(targetCredits, TIMING.CREDIT_COUNTDOWN_DURATION);
        }, 100);

        // Hide deduction indicator just before burn ends (synced timing)
        createTimeout(() => {
          setPendingDeduction(null);
        }, TIMING.BURN_DURATION - 50);

        // End burn animation and mark complete
        createTimeout(() => {
          setShowBurn(false);
          setCompletedActivities(completedList);
          setActiveActivity(null);
        }, TIMING.BURN_DURATION);
      }, TIMING.BURN_DELAY);
    };

    const timeline: { phase: Phase; duration: number }[] = [
      { phase: "mining", duration: TIMING.MINING_DURATION },
      { phase: "loaded", duration: 800 },
      { phase: "idle", duration: 900 },
      { phase: "expanded", duration: 800 },
      { phase: "select-1", duration: TIMING.SELECTION_PHASE_DURATION },
      { phase: "select-2", duration: TIMING.SELECTION_PHASE_DURATION },
      { phase: "select-3", duration: TIMING.SELECTION_PHASE_DURATION },
      { phase: "complete", duration: 1500 },
      { phase: "reset", duration: 400 },
    ];

    let phaseTimeoutId: NodeJS.Timeout;
    let currentIndex = 0;

    const runPhase = () => {
      const current = timeline[currentIndex];
      setPhase(current.phase);

      if (current.phase === "mining") {
        // Reset everything
        clearCountInterval();
        clearAllTimeouts();
        creditsRef.current = 0;
        setCredits(0);
        setCompletedActivities([]);
        setActiveActivity(null);
        setShowBurn(false);
        setPendingDeduction(null);

        // Count up to target smoothly over the mining duration
        const countDuration = TIMING.MINING_DURATION - 200; // Leave buffer at end
        const steps = 20;
        const stepDuration = countDuration / steps;
        let currentStep = 0;

        countIntervalRef.current = setInterval(() => {
          currentStep++;
          const newCredits = Math.round((currentStep / steps) * INITIAL_CREDITS);
          creditsRef.current = newCredits;
          setCredits(newCredits);

          if (currentStep >= steps) {
            creditsRef.current = INITIAL_CREDITS;
            setCredits(INITIAL_CREDITS);
            clearCountInterval();
          }
        }, stepDuration);
      } else if (current.phase === "select-1") {
        const { targetCredits, completedList } = selectionTargets[0];
        createTimeout(() => handleSelection(0, targetCredits, completedList), TIMING.SELECTION_START_DELAY);
      } else if (current.phase === "select-2") {
        const { targetCredits, completedList } = selectionTargets[1];
        createTimeout(() => handleSelection(1, targetCredits, completedList), TIMING.SELECTION_START_DELAY);
      } else if (current.phase === "select-3") {
        const { targetCredits, completedList } = selectionTargets[2];
        createTimeout(() => handleSelection(2, targetCredits, completedList), TIMING.SELECTION_START_DELAY);
      }

      currentIndex = (currentIndex + 1) % timeline.length;
      phaseTimeoutId = setTimeout(runPhase, current.duration);
    };

    runPhase();
    return () => {
      clearTimeout(phaseTimeoutId);
      clearCountInterval();
      clearAllTimeouts();
    };
  }, []);

  // Derived states
  const showUSDC = phase === "mining";
  const showWristbandGlow = phase === "loaded";

  // Show centered game icon at idle, complete, and reset phases
  const showGameIcon = phase === "idle" || phase === "complete" || phase === "reset";

  // Show expanded view throughout all selection phases
  const showExpanded = phase === "expanded" || phase === "select-1" || phase === "select-2" || phase === "select-3";

  // Simplified motion props for reduced motion preference
  const getMotionProps = (normalProps: object, reducedProps: object) =>
    prefersReducedMotion ? reducedProps : normalProps;

  return (
    <div className="relative flex flex-col items-center h-[240px]">
      {/* USDC Coins - floating down during mining */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-3 h-16">
        <AnimatePresence>
          {showUSDC && (
            <>
              {[0, 1, 2].map(i => (
                <USDCCoin key={i} index={i} prefersReducedMotion={prefersReducedMotion} />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Wristband - FIXED position */}
      <div className="mt-16">
        <WristbandIcon credits={credits} isGlowing={showWristbandGlow} isBurning={showBurn} size="sm" />
      </div>

      {/* Activity Icons Area */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[260px] flex justify-center px-4">
        <AnimatePresence mode="popLayout">
          {showGameIcon && (
            <motion.div
              key="game-icon"
              {...getMotionProps(
                {
                  initial: { opacity: 0, scale: 0.7 },
                  animate: { opacity: 1, scale: 1 },
                  exit: { opacity: 0, scale: 0.8 },
                  transition: { duration: 0.35, ease: "easeOut" },
                },
                {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  exit: { opacity: 0 },
                  transition: { duration: 0.15 },
                },
              )}
              className="flex justify-center"
            >
              <motion.div
                {...getMotionProps(
                  {
                    animate: { y: [0, -3, 0], scale: [1, 1.03, 1] },
                    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  },
                  {},
                )}
                className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center shadow-md"
              >
                <Gamepad2 className="w-6 h-6 text-base-content/70" />
              </motion.div>
            </motion.div>
          )}

          {showExpanded && (
            <motion.div
              key="expanded"
              {...getMotionProps(
                {
                  initial: { opacity: 0, scale: 0.9 },
                  animate: { opacity: 1, scale: 1 },
                  exit: { opacity: 0, scale: 0.9 },
                  transition: { duration: 0.35, ease: "easeOut" },
                },
                {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  exit: { opacity: 0 },
                  transition: { duration: 0.15 },
                },
              )}
              className="flex items-center gap-2"
            >
              {/* Game controller on left */}
              <motion.div
                {...getMotionProps(
                  {
                    initial: { x: 30, scale: 1.3, opacity: 0 },
                    animate: { x: 0, scale: 1, opacity: 1 },
                    transition: { duration: 0.4, ease: "easeOut" },
                  },
                  {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    transition: { duration: 0.15 },
                  },
                )}
                className="w-9 h-9 rounded-full bg-base-300 flex items-center justify-center flex-shrink-0 shadow-sm"
              >
                <Gamepad2 className="w-4 h-4 text-base-content/60" />
              </motion.div>

              {/* 3 Activity icons */}
              {activities.map((activity, i) => {
                const isActive = activeActivity === i;
                const isCompleted = completedActivities.includes(i);

                return (
                  <motion.div
                    key={i}
                    {...getMotionProps(
                      {
                        initial: { opacity: 0, scale: 0.3, x: -15 },
                        animate: { opacity: 1, scale: isActive ? 1.2 : 1, x: 0 },
                        transition: {
                          delay: 0.1 + i * 0.08,
                          duration: 0.3,
                          ease: "easeOut",
                          scale: { duration: 0.15 },
                        },
                      },
                      {
                        initial: { opacity: 0 },
                        animate: { opacity: 1, scale: isActive ? 1.1 : 1 },
                        transition: { duration: 0.15 },
                      },
                    )}
                    className={`w-10 h-10 rounded-full flex items-center justify-center relative flex-shrink-0 ${activity.bgColor}`}
                    style={{
                      boxShadow: isActive ? `0 0 25px ${activity.glowColor}` : "none",
                      transition: "box-shadow 0.15s ease",
                    }}
                  >
                    <activity.Icon className={`w-5 h-5 ${activity.color}`} />

                    {/* Checkmark for completed */}
                    <AnimatePresence>
                      {isCompleted && (
                        <motion.div
                          {...getMotionProps(
                            {
                              initial: { scale: 0, opacity: 0 },
                              animate: { scale: 1, opacity: 1 },
                              exit: { scale: 0, opacity: 0 },
                              transition: { duration: 0.2, ease: "easeOut" },
                            },
                            {
                              initial: { opacity: 0 },
                              animate: { opacity: 1 },
                              exit: { opacity: 0 },
                              transition: { duration: 0.1 },
                            },
                          )}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center"
                        >
                          <Check className="w-2.5 h-2.5 text-success-content" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Credit deduction indicator - positioned near wristband */}
      <div className="absolute top-[115px] left-1/2 -translate-x-1/2">
        <AnimatePresence>
          {pendingDeduction !== null && (
            <motion.div
              {...getMotionProps(
                {
                  initial: { opacity: 0, scale: 0.5, y: -10 },
                  animate: { opacity: 1, scale: 1, y: 0 },
                  exit: { opacity: 0, scale: 0.8, y: 5, transition: { duration: 0.15 } },
                  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
                },
                {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  exit: { opacity: 0 },
                  transition: { duration: 0.1 },
                },
              )}
              className="flex items-center justify-center px-2 py-0.5 rounded-full bg-error/20 backdrop-blur-sm"
            >
              <motion.span
                className="text-sm font-bold text-error"
                {...getMotionProps(
                  {
                    animate: { opacity: [1, 0.6, 1] },
                    transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
                  },
                  {},
                )}
              >
                -{pendingDeduction}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

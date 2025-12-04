"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Nfc } from "lucide-react";

interface Friend {
  name: string;
  amount: number;
  owes: boolean; // true = they owe you (green), false = you owe them (red)
}

const friends: Friend[] = [
  { name: "Alex", amount: 25.0, owes: true },
  { name: "Sam", amount: 18.5, owes: false },
  { name: "Jordan", amount: 12.0, owes: true },
];

// Timing constants (ms) - centralized for easy tuning
const TIMING = {
  CARDS_IN: 1500,
  SELECT: 1500,
  TAP: 2000,
  SETTLE: 1500,
  PAUSE: 1500,
};

// Consistent colors
const COLORS = {
  POSITIVE: "#22c55e", // Tailwind green-500, matches DaisyUI success
  NEGATIVE: "#FF6A4A",
  SETTLED: "#22c55e",
};

// Animation phases: cards-in → select → tap → settle → pause → repeat
type Phase = "cards-in" | "select" | "tap" | "settle" | "pause";

export function FriendsAnimation() {
  const [phase, setPhase] = useState<Phase>("cards-in");
  const [settledIndex, setSettledIndex] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]); // Track all timeouts for cleanup

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

  // Clear all tracked timeouts
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(() => {
    const timeline = [
      { phase: "cards-in" as Phase, duration: TIMING.CARDS_IN },
      { phase: "select" as Phase, duration: TIMING.SELECT },
      { phase: "tap" as Phase, duration: TIMING.TAP },
      { phase: "settle" as Phase, duration: TIMING.SETTLE },
      { phase: "pause" as Phase, duration: TIMING.PAUSE },
    ];

    let currentIndex = 0;

    const runPhase = () => {
      const current = timeline[currentIndex];
      setPhase(current.phase);

      if (current.phase === "settle") {
        setSettledIndex(1); // Sam gets settled
      } else if (current.phase === "cards-in") {
        setSettledIndex(null); // Reset for next loop
      }

      currentIndex = (currentIndex + 1) % timeline.length;
      const timeoutId = setTimeout(runPhase, current.duration);
      timeoutsRef.current.push(timeoutId);
    };

    runPhase();
    return () => clearAllTimeouts();
  }, []);

  const isSelected = phase === "select" || phase === "tap" || phase === "settle";
  const showTap = phase === "tap";
  const isSettled = phase === "settle" || phase === "pause";

  // Simplified motion props for reduced motion preference
  const getMotionProps = (normalProps: object, reducedProps: object) =>
    prefersReducedMotion ? reducedProps : normalProps;

  return (
    <div className="relative flex flex-col items-center h-[240px] overflow-hidden">
      {/* Friend balance cards - fixed position at top */}
      <div className="space-y-2 w-full max-w-[200px] pt-4">
        {friends.map((friend, idx) => {
          const isThisSelected = idx === 1 && isSelected;
          const isThisSettled = idx === 1 && settledIndex === 1 && isSettled;

          return (
            <motion.div
              key={friend.name}
              {...getMotionProps(
                {
                  initial: { opacity: 0, x: -30 },
                  animate: {
                    opacity: 1,
                    x: 0,
                    scale: isThisSelected && !isThisSettled ? [1, 1.02, 1] : 1,
                    boxShadow: isThisSelected && !isThisSettled ? "0 0 20px rgba(242, 169, 0, 0.3)" : "none",
                  },
                  transition: {
                    opacity: { delay: idx * 0.15, duration: 0.4 },
                    x: { delay: idx * 0.15, duration: 0.4 },
                    scale: { duration: 1.2, repeat: isThisSelected && !isThisSettled ? Infinity : 0 },
                  },
                },
                {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  transition: { duration: 0.2 },
                },
              )}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-300/50 border border-base-300"
            >
              <span className="text-sm font-medium text-base-content">{friend.name}</span>
              <motion.span
                className="text-sm font-bold tabular-nums"
                {...getMotionProps(
                  {
                    animate: {
                      color: isThisSettled ? COLORS.SETTLED : friend.owes ? COLORS.POSITIVE : COLORS.NEGATIVE,
                    },
                    transition: { duration: 0.3 },
                  },
                  {},
                )}
                style={{
                  color: isThisSettled ? COLORS.SETTLED : friend.owes ? COLORS.POSITIVE : COLORS.NEGATIVE,
                }}
              >
                {isThisSettled ? (
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Settled</span>
                  </span>
                ) : (
                  <>
                    {friend.owes ? "+" : "-"}${friend.amount.toFixed(2)}
                  </>
                )}
              </motion.span>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom area for NFC and success - absolute positioned */}
      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center justify-center h-[80px]">
        {/* NFC Tap indicator */}
        <AnimatePresence mode="wait">
          {showTap && (
            <motion.div
              key="nfc"
              {...getMotionProps(
                {
                  initial: { opacity: 0, scale: 0.8 },
                  animate: { opacity: 1, scale: 1 },
                  exit: { opacity: 0, scale: 0.8 },
                  transition: { duration: 0.3 },
                },
                {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  exit: { opacity: 0 },
                  transition: { duration: 0.15 },
                },
              )}
              className="relative"
            >
              {/* Pulse rings - hidden for reduced motion */}
              {!prefersReducedMotion && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="landing-nfc-ring w-16 h-16 rounded-full border-2 border-primary/40 absolute" />
                  <div
                    className="landing-nfc-ring w-16 h-16 rounded-full border-2 border-primary/40 absolute"
                    style={{ animationDelay: "0.5s" }}
                  />
                </div>
              )}

              {/* NFC chip button */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center relative z-10">
                <Nfc className="w-6 h-6 text-primary-content" />
              </div>
            </motion.div>
          )}

          {/* Success indicator */}
          {isSettled && (
            <motion.div
              key="settled"
              {...getMotionProps(
                {
                  initial: { opacity: 0, y: 10 },
                  animate: { opacity: 1, y: 0 },
                  exit: { opacity: 0 },
                },
                {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  exit: { opacity: 0 },
                  transition: { duration: 0.15 },
                },
              )}
              className="flex items-center gap-1.5 text-success text-sm font-medium"
            >
              <motion.div
                {...getMotionProps(
                  {
                    initial: { scale: 0 },
                    animate: { scale: 1 },
                    transition: { type: "spring", stiffness: 300, damping: 20 },
                  },
                  {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                  },
                )}
              >
                <Check className="w-4 h-4" />
              </motion.div>
              <span>Settled!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

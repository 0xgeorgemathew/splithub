"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Bot, Check, Settings, Wallet } from "lucide-react";

// Timing constants (ms)
const TIMING = {
  WALLET: 2000,
  DEPLOY: 2000,
  YIELD: 2500,
  JIT: 2000,
  COMPLETE: 1500,
  PAUSE: 1000,
};

// Colors matching the info theme
const COLORS = {
  PRIMARY: "#3b82f6", // blue-500, matches DaisyUI info
  YIELD: "#22c55e", // green-500 for positive yield
  USDC: "#2775CA",
};

// Animation phases
type Phase = "wallet" | "deploy" | "yield" | "jit" | "complete" | "pause";

export function AgentAnimation() {
  const [phase, setPhase] = useState<Phase>("wallet");
  const [walletBalance, setWalletBalance] = useState(500);
  const [aaveBalance, setAaveBalance] = useState(0);
  const [yieldEarned, setYieldEarned] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const balanceIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const clearBalanceInterval = () => {
    if (balanceIntervalRef.current) {
      clearInterval(balanceIntervalRef.current);
      balanceIntervalRef.current = null;
    }
  };

  // Animate a balance value smoothly
  const animateBalance = (setter: (v: number) => void, from: number, to: number, duration: number) => {
    const steps = 20;
    const stepDuration = duration / steps;
    let currentStep = 0;

    clearBalanceInterval();
    balanceIntervalRef.current = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (to - from) * easedProgress);
      setter(value);

      if (currentStep >= steps) {
        setter(to);
        clearBalanceInterval();
      }
    }, stepDuration);
  };

  useEffect(() => {
    const walletRef = { current: 500 };
    const aaveRef = { current: 0 };
    const yieldRef = { current: 0 };

    const timeline: { phase: Phase; duration: number }[] = [
      { phase: "wallet", duration: TIMING.WALLET },
      { phase: "deploy", duration: TIMING.DEPLOY },
      { phase: "yield", duration: TIMING.YIELD },
      { phase: "jit", duration: TIMING.JIT },
      { phase: "complete", duration: TIMING.COMPLETE },
      { phase: "pause", duration: TIMING.PAUSE },
    ];

    let currentIndex = 0;

    const runPhase = () => {
      const current = timeline[currentIndex];
      setPhase(current.phase);

      if (current.phase === "wallet") {
        // Reset
        clearBalanceInterval();
        walletRef.current = 500;
        aaveRef.current = 0;
        yieldRef.current = 0;
        setWalletBalance(500);
        setAaveBalance(0);
        setYieldEarned(0);
      } else if (current.phase === "deploy") {
        // Animate: wallet 500→50, aave 0→450
        animateBalance(
          v => {
            walletRef.current = v;
            setWalletBalance(v);
          },
          500,
          50,
          TIMING.DEPLOY - 300,
        );
        animateBalance(
          v => {
            aaveRef.current = v;
            setAaveBalance(v);
          },
          0,
          450,
          TIMING.DEPLOY - 300,
        );
      } else if (current.phase === "yield") {
        // Animate: yield accumulates, aave grows slightly
        animateBalance(
          v => {
            yieldRef.current = v;
            setYieldEarned(v);
          },
          0,
          12,
          TIMING.YIELD - 400,
        );
        animateBalance(
          v => {
            aaveRef.current = v;
            setAaveBalance(v);
          },
          450,
          462,
          TIMING.YIELD - 400,
        );
      } else if (current.phase === "jit") {
        // Animate: aave 462→162, wallet 50→350 (JIT fund for payment)
        animateBalance(
          v => {
            walletRef.current = v;
            setWalletBalance(v);
          },
          50,
          350,
          TIMING.JIT - 300,
        );
        animateBalance(
          v => {
            aaveRef.current = v;
            setAaveBalance(v);
          },
          462,
          162,
          TIMING.JIT - 300,
        );
      }

      currentIndex = (currentIndex + 1) % timeline.length;
      const timeoutId = setTimeout(runPhase, current.duration);
      timeoutsRef.current.push(timeoutId);
    };

    runPhase();
    return () => {
      clearAllTimeouts();
      clearBalanceInterval();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showDeploy = phase === "deploy";
  const showYield = phase === "yield";
  const showJit = phase === "jit";
  const showComplete = phase === "complete";
  const showPause = phase === "pause";

  const getMotionProps = (normalProps: object, reducedProps: object) =>
    prefersReducedMotion ? reducedProps : normalProps;

  return (
    <div className="relative flex flex-col items-center h-[240px] overflow-hidden">
      {/* Agent Status Bar */}
      <div className="w-full max-w-[200px] pt-4 space-y-2">
        {/* Wallet Row */}
        <motion.div
          {...getMotionProps(
            {
              animate: {
                boxShadow: showDeploy
                  ? `0 0 15px ${COLORS.PRIMARY}40`
                  : showJit
                    ? `0 0 15px ${COLORS.YIELD}40`
                    : "none",
              },
            },
            {},
          )}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-300/50 border border-base-300"
        >
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-base-content/60" />
            <span className="text-xs font-medium text-base-content/70">Wallet</span>
          </div>
          <span className="text-sm font-bold tabular-nums text-base-content">${walletBalance}</span>
        </motion.div>

        {/* Agent Row */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-info/10 border border-info/20">
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={(showDeploy || showYield || showJit) && !prefersReducedMotion ? { rotate: 360 } : { rotate: 0 }}
              transition={{
                duration: 2,
                repeat: showDeploy || showYield || showJit ? Infinity : 0,
                ease: "linear",
              }}
            >
              <Settings className="w-3.5 h-3.5 text-info" />
            </motion.div>
            <span className="text-xs font-medium text-info">Vincent</span>
          </div>
          <AnimatePresence mode="wait">
            {showDeploy && (
              <motion.span
                key="deploy"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium text-info"
              >
                Deploying...
              </motion.span>
            )}
            {showYield && (
              <motion.span
                key="yield"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium text-success"
              >
                Earning {yieldEarned > 0 ? `+$${yieldEarned}` : "..."}
              </motion.span>
            )}
            {showJit && (
              <motion.span
                key="jit"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium text-info"
              >
                JIT Funding...
              </motion.span>
            )}
            {(phase === "wallet" || showPause) && (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium text-base-content/50"
              >
                Idle
              </motion.span>
            )}
            {showComplete && (
              <motion.span
                key="complete"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium text-success flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Funded
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Aave Row */}
        <motion.div
          {...getMotionProps(
            {
              animate: {
                boxShadow: showYield
                  ? `0 0 15px ${COLORS.YIELD}40`
                  : showDeploy
                    ? `0 0 15px ${COLORS.PRIMARY}40`
                    : "none",
              },
            },
            {},
          )}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-300/50 border border-base-300"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-info">Aa</span>
            <span className="text-xs font-medium text-base-content/70">Aave</span>
          </div>
          <span className="text-sm font-bold tabular-nums text-base-content">${aaveBalance}</span>
        </motion.div>
      </div>

      {/* Flow indicators between rows */}
      <AnimatePresence>
        {showDeploy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-[72px] left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={prefersReducedMotion ? {} : { y: [0, 4, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <ArrowDown className="w-4 h-4 text-info" />
            </motion.div>
          </motion.div>
        )}
        {showJit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-[105px] left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={prefersReducedMotion ? {} : { y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <ArrowUp className="w-4 h-4 text-info" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Yield particles */}
      <AnimatePresence>
        {showYield && !prefersReducedMotion && (
          <>
            {[0, 1, 2].map(i => (
              <motion.div
                key={`yield-${i}`}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: [0, -30, -50] }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.5,
                  repeat: Infinity,
                  repeatDelay: 0.3,
                }}
                className="absolute top-[110px] left-1/2 -translate-x-1/2 text-success font-bold text-xs"
              >
                +APY
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Bottom agent icon */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <AnimatePresence mode="wait">
          {showComplete && (
            <motion.div
              key="complete-icon"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center"
            >
              <Check className="w-6 h-6 text-success" />
            </motion.div>
          )}
          {!showComplete && !showPause && (
            <motion.div
              key="agent-icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center"
            >
              <Bot className="w-6 h-6 text-info" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

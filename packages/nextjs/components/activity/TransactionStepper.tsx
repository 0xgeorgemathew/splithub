"use client";

import { useEffect, useRef } from "react";
import { colors } from "./styles";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { Check, Circle, Loader2 } from "lucide-react";

// Transaction step states
export type StepStatus = "pending" | "active" | "completed" | "error";

export interface TransactionStep {
  id: string;
  label: string;
  description?: string;
  status: StepStatus;
}

interface TransactionStepperProps {
  steps: TransactionStep[];
  className?: string;
}

// Spring physics for smooth animations
const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
};

// Pop animation for completed steps
const completionPopTransition = {
  type: "spring" as const,
  stiffness: 500,
  damping: 15,
};

// Haptic feedback helper
const triggerHaptic = (pattern: number | number[] = 30) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

// Step icon component with visual states
function StepIcon({ status }: { status: StepStatus }) {
  return (
    <div className="relative flex items-center justify-center w-6 h-6">
      <AnimatePresence mode="wait">
        {/* PENDING: Empty circle, grey, low opacity */}
        {status === "pending" && (
          <motion.div
            key="pending"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={springTransition}
          >
            <Circle className="w-5 h-5" style={{ color: colors.pending.primary }} strokeWidth={2} />
          </motion.div>
        )}

        {/* ACTIVE: Spinning loader */}
        {status === "active" && (
          <motion.div
            key="active"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={springTransition}
            className="relative"
          >
            {/* Pulsing glow behind loader */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: colors.processing.bg }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.processing.primary }} strokeWidth={2.5} />
          </motion.div>
        )}

        {/* COMPLETED: Green checkmark with pop */}
        {status === "completed" && (
          <motion.div
            key="completed"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: [0, 1.2, 1], rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={completionPopTransition}
            className="flex items-center justify-center w-5 h-5 rounded-full"
            style={{ backgroundColor: colors.success.primary }}
          >
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </motion.div>
        )}

        {/* ERROR: Red circle */}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.1, 1] }}
            exit={{ scale: 0 }}
            transition={springTransition}
            className="flex items-center justify-center w-5 h-5 rounded-full"
            style={{ backgroundColor: colors.error.primary }}
          >
            <span className="text-white font-bold text-xs">!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Single step row with completion pop animation
function StepRow({ step, prevStatus }: { step: TransactionStep; prevStatus?: StepStatus }) {
  const controls = useAnimation();
  const hasAnimated = useRef(false);

  // Trigger pop animation when transitioning to completed
  useEffect(() => {
    if (step.status === "completed" && prevStatus !== "completed" && !hasAnimated.current) {
      hasAnimated.current = true;
      triggerHaptic([20, 10, 30]);
      controls.start({
        scale: [1, 1.08, 1],
        transition: { duration: 0.3, ease: "easeOut" },
      });
    }
  }, [step.status, prevStatus, controls]);

  // Get text color based on status
  const getTextColor = () => {
    switch (step.status) {
      case "completed":
        return colors.success.primary;
      case "active":
        return colors.text.primary;
      case "error":
        return colors.error.primary;
      default:
        return colors.pending.primary;
    }
  };

  return (
    <motion.div initial={false} animate={controls} className="flex items-center gap-3 py-2">
      {/* Icon */}
      <StepIcon status={step.status} />

      {/* Label - Using sans-serif font */}
      <div className="flex-1 min-w-0">
        <motion.p
          initial={false}
          animate={{
            color: getTextColor(),
            opacity: step.status === "pending" ? 0.4 : 1,
          }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium font-sans"
        >
          {step.label}
        </motion.p>

        {/* Description (shows when active) */}
        <AnimatePresence>
          {step.description && step.status === "active" && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 0.7, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs font-sans mt-0.5"
              style={{ color: colors.text.secondary }}
            >
              {step.description}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Status badge */}
      <AnimatePresence>
        {step.status === "active" && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="text-xs font-medium font-sans"
              style={{ color: colors.processing.primary }}
            >
              Processing
            </motion.span>
          </motion.div>
        )}

        {step.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-xs font-medium font-sans" style={{ color: colors.success.primary }}>
              Done
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TransactionStepper({ steps, className = "" }: TransactionStepperProps) {
  // Track previous statuses for detecting transitions
  const prevStatusesRef = useRef<Record<string, StepStatus>>({});

  useEffect(() => {
    // Update previous statuses after render
    const newStatuses: Record<string, StepStatus> = {};
    steps.forEach(step => {
      newStatuses[step.id] = step.status;
    });
    prevStatusesRef.current = newStatuses;
  }, [steps]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`space-y-0 ${className}`}>
      {steps.map((step, index) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <StepRow step={step} prevStatus={prevStatusesRef.current[step.id]} />

          {/* Connector line between steps */}
          {index < steps.length - 1 && (
            <div className="ml-3 pl-[0.3rem]">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: step.status === "completed" ? colors.success.primary : colors.pending.primary,
                  scaleY: step.status === "completed" ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  backgroundColor: { duration: 0.3 },
                  scaleY: completionPopTransition,
                }}
                className="w-0.5 h-3 rounded-full origin-top"
              />
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

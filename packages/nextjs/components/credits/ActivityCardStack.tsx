"use client";

import { AccessGrantedCard } from "./cards/AccessGrantedCard";
import { ErrorCard } from "./cards/ErrorCard";
import { TapCard } from "./cards/TapCard";
import { AnimatePresence, motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { CreditFlowState } from "~~/hooks/credits/useCreditSpend";

interface ActivityCardStackProps {
  flowState: CreditFlowState;
  activityName: string;
  activityIcon: LucideIcon;
  creditsAmount: number;
  remainingBalance: string | null;
  error?: string | null;
  txHash?: string | null;
  chainId: number;
  onRetry: () => void;
  onDismiss: () => void;
}

// Visual phases for card switching
type CardPhase = "tap1" | "tap2" | "processing" | "success" | "error";

// Map detailed flow states to simple visual phases
function mapFlowToPhase(flowState: CreditFlowState): CardPhase {
  switch (flowState) {
    case "tapping":
    case "signing":
      return "tap1";
    case "preparing":
    case "confirming_signature":
      return "tap2";
    case "submitting":
    case "confirming":
      return "processing";
    case "success":
      return "success";
    case "error":
      return "error";
    default:
      return "tap1";
  }
}

// Get processing phase text
function getProcessingText(flowState: CreditFlowState): { title: string; subtitle: string } {
  if (flowState === "confirming") {
    return {
      title: "Confirming Access",
      subtitle: "Waiting for blockchain confirmation...",
    };
  }
  return {
    title: "Spending Credits",
    subtitle: "Processing your request...",
  };
}

/**
 * Parse balance from raw bigint string (18 decimals)
 */
function parseBalance(value: string | null): number {
  if (!value || value.trim() === "") return 0;
  try {
    return Number(BigInt(value) / BigInt(10 ** 18));
  } catch {
    return 0;
  }
}

// Card animation variants
const cardVariants = {
  initial: { y: 40, opacity: 0, scale: 0.96 },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    y: -20,
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.2 },
  },
};

// Processing card component (inline to avoid duplication)
function ActivityProcessingCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center text-center py-8">
      {/* Processing indicator */}
      <div className="relative mb-6">
        {/* Outer glow ring - using CSS animation instead of spring with multiple keyframes */}
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{ backgroundColor: "rgba(59, 130, 246, 0.2)" }}
        />

        {/* Spinner */}
        <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-primary/20">
          <span className="loading loading-spinner loading-lg text-warning"></span>
        </div>
      </div>

      {/* Animated status text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={title}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots - using CSS animation */}
      <div className="flex gap-1.5 mt-6">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-warning animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ActivityCardStack({
  flowState,
  activityName,
  activityIcon,
  creditsAmount,
  remainingBalance,
  error,
  txHash,
  chainId,
  onRetry,
  onDismiss,
}: ActivityCardStackProps) {
  const phase = mapFlowToPhase(flowState);

  // Don't render anything if idle
  if (flowState === "idle") {
    return null;
  }

  const processingText = getProcessingText(flowState);

  return (
    <div className="w-full max-w-sm mx-auto">
      <AnimatePresence mode="wait">
        {phase === "tap1" && (
          <motion.div key="tap1" variants={cardVariants} initial="initial" animate="animate" exit="exit">
            <TapCard message="Tap your chip" />
          </motion.div>
        )}

        {phase === "tap2" && (
          <motion.div key="tap2" variants={cardVariants} initial="initial" animate="animate" exit="exit">
            <TapCard message="Tap again to confirm" />
          </motion.div>
        )}

        {phase === "processing" && (
          <motion.div key="processing" variants={cardVariants} initial="initial" animate="animate" exit="exit">
            <ActivityProcessingCard title={processingText.title} subtitle={processingText.subtitle} />
          </motion.div>
        )}

        {phase === "success" && (
          <motion.div key="success" variants={cardVariants} initial="initial" animate="animate" exit="exit">
            <AccessGrantedCard
              activityName={activityName}
              activityIcon={activityIcon}
              creditsSpent={creditsAmount}
              remainingBalance={parseBalance(remainingBalance)}
              txHash={txHash}
              chainId={chainId}
              onDismiss={onDismiss}
            />
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div key="error" variants={cardVariants} initial="initial" animate="animate" exit="exit">
            <ErrorCard message={error || "An unexpected error occurred"} onRetry={onRetry} onDismiss={onDismiss} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

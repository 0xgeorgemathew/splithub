"use client";

import { CreditsCard } from "./cards/CreditsCard";
import { ErrorCard } from "./cards/ErrorCard";
import { ProcessingCard } from "./cards/ProcessingCard";
import { TapCard } from "./cards/TapCard";
import { AnimatePresence, motion } from "framer-motion";
import { CreditFlowState } from "~~/hooks/credits/useCreditPurchase";

interface POSCardStackProps {
  flowState: CreditFlowState;
  amount: number;
  creditsMinted: string | null;
  newBalance: string | null;
  error?: string;
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

// Get processing phase for ProcessingCard
function getProcessingPhase(flowState: CreditFlowState): "sending" | "confirming" {
  return flowState === "confirming" ? "confirming" : "sending";
}

/**
 * Parse credits minted from raw bigint string
 * CreditToken uses 18 decimals: 10 credits = "10000000000000000000"
 * @param value - Raw bigint string from API (18 decimals)
 * @param fallbackAmount - USDC amount in whole units (1 USDC = 10 credits)
 */
function parseCredits(value: string | null, fallbackAmount: number): number {
  if (!value || value.trim() === "") return fallbackAmount * 10;
  try {
    // CreditToken: 18 decimals
    return Number(BigInt(value) / BigInt(10 ** 18));
  } catch {
    return fallbackAmount * 10;
  }
}

/**
 * Parse chip owner's credit balance with fallbacks
 * Balance and creditsMinted are both raw bigint strings (18 decimals)
 * @param value - Raw balance from balanceOf (18 decimals)
 * @param creditsMinted - Raw credits minted from API (18 decimals)
 * @param fallbackAmount - USDC amount in whole units (1 USDC = 10 credits)
 */
function parseBalance(value: string | null, creditsMinted: string | null, fallbackAmount: number): number {
  // First try to parse the actual balance (18 decimals)
  if (value && value.trim() !== "" && value !== "0") {
    try {
      const balance = Number(BigInt(value) / BigInt(10 ** 18));
      if (balance > 0) return balance;
    } catch {
      // Fall through to fallback
    }
  }

  // Balance fetch failed - use creditsMinted as fallback
  // This is the minimum the chip owner should have after this purchase
  if (creditsMinted && creditsMinted.trim() !== "") {
    try {
      return Number(BigInt(creditsMinted) / BigInt(10 ** 18));
    } catch {
      // Fall through to final fallback
    }
  }

  // Final fallback: calculated credits (1 USDC = 10 credits)
  return fallbackAmount * 10;
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

export function POSCardStack({
  flowState,
  amount,
  creditsMinted,
  newBalance,
  error,
  txHash,
  chainId,
  onRetry,
  onDismiss,
}: POSCardStackProps) {
  const phase = mapFlowToPhase(flowState);

  // Don't render anything if idle
  if (flowState === "idle") {
    return null;
  }

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
            <ProcessingCard phase={getProcessingPhase(flowState)} />
          </motion.div>
        )}

        {phase === "success" && (
          <motion.div key="success" variants={cardVariants} initial="initial" animate="animate" exit="exit">
            <CreditsCard
              creditsLoaded={parseCredits(creditsMinted, amount)}
              newBalance={parseBalance(newBalance, creditsMinted, amount)}
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

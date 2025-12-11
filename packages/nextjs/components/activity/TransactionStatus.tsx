"use client";

import { useMemo } from "react";
import { SuccessSummary } from "./SuccessSummary";
import { CardStatus, TransactionCard } from "./TransactionCard";
import { StepStatus, TransactionStep, TransactionStepper } from "./TransactionStepper";
import { colors, effects } from "./styles";
import { motion } from "framer-motion";
import { CreditFlowState } from "~~/hooks/credits/useCreditSpend";

// Pre-computed particle positions to avoid Math.random() in render
const PARTICLE_POSITIONS = [
  { x: "25%", y: "15%" },
  { x: "65%", y: "25%" },
  { x: "40%", y: "35%" },
  { x: "75%", y: "20%" },
  { x: "30%", y: "40%" },
  { x: "55%", y: "30%" },
];

interface TransactionStatusProps {
  flowState: CreditFlowState;
  activityName?: string;
  creditsAmount?: number;
  txHash?: string | null;
  chainId?: number;
  remainingBalance?: string | null;
  error?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  /** "spend" for credit spending, "purchase" for credit buying */
  variant?: "spend" | "purchase";
}

// Map CreditFlowState to step statuses
function getStepStatuses(flowState: CreditFlowState): Record<string, StepStatus> {
  const states: Record<string, StepStatus> = {
    auth: "pending",
    payment: "pending",
    reward: "pending",
    complete: "pending",
  };

  switch (flowState) {
    case "idle":
      // All pending
      break;
    case "tapping":
    case "signing":
    case "preparing":
    case "confirming_signature":
      // All auth-related states show auth as active
      states.auth = "active";
      break;
    case "submitting":
      states.auth = "completed";
      states.payment = "active";
      break;
    case "confirming":
      states.auth = "completed";
      states.payment = "completed";
      states.reward = "active";
      break;
    case "success":
      states.auth = "completed";
      states.payment = "completed";
      states.reward = "completed";
      states.complete = "completed";
      break;
    case "error":
      // Mark the current active step as error
      states.auth = "error";
      break;
  }

  return states;
}

// Get step descriptions based on current state
function getStepDescriptions(flowState: CreditFlowState): Record<string, string | undefined> {
  const descriptions: Record<string, string | undefined> = {
    auth: undefined,
    payment: undefined,
    reward: undefined,
    complete: undefined,
  };

  switch (flowState) {
    case "tapping":
      descriptions.auth = "Tap your NFC chip";
      break;
    case "signing":
      descriptions.auth = "Reading chip...";
      break;
    case "preparing":
      descriptions.auth = "Preparing transaction...";
      break;
    case "confirming_signature":
      descriptions.auth = "Tap again to confirm";
      break;
    case "submitting":
      descriptions.payment = "Broadcasting to network...";
      break;
    case "confirming":
      descriptions.reward = "Waiting for confirmation...";
      break;
  }

  return descriptions;
}

// Map flow state to card status
function getCardStatus(flowState: CreditFlowState): CardStatus {
  if (flowState === "success") return "success";
  if (flowState === "error") return "error";
  return "processing";
}

// Get title based on flow state
function getTitle(flowState: CreditFlowState): string {
  switch (flowState) {
    case "idle":
      return "Ready";
    case "tapping":
      return "Tap to Authenticate";
    case "signing":
      return "Reading Chip...";
    case "preparing":
      return "Preparing...";
    case "confirming_signature":
      return "Confirm Transaction";
    case "submitting":
      return "Sending Transaction";
    case "confirming":
      return "Almost Done...";
    case "error":
      return "Transaction Failed";
    default:
      return "Processing";
  }
}

// Get subtitle for processing states
function getSubtitle(flowState: CreditFlowState, activityName?: string): string | undefined {
  if (flowState === "tapping" && activityName) {
    return `Access ${activityName}`;
  }
  return undefined;
}

export function TransactionStatus({
  flowState,
  activityName,
  creditsAmount,
  txHash,
  chainId,
  remainingBalance,
  error,
  onRetry,
  onDismiss,
  variant = "spend",
}: TransactionStatusProps) {
  const isPurchase = variant === "purchase";

  // Compute step data for processing states
  const steps = useMemo<TransactionStep[]>(() => {
    const statuses = getStepStatuses(flowState);
    const descriptions = getStepDescriptions(flowState);

    return [
      {
        id: "auth",
        label: "Verifying Signature",
        description: descriptions.auth,
        status: statuses.auth,
      },
      {
        id: "payment",
        label: isPurchase ? "Sending USDC" : "Sending Payment",
        description: descriptions.payment,
        status: statuses.payment,
      },
      {
        id: "reward",
        label: isPurchase ? "Receiving Credits" : "Minting Credits",
        description: descriptions.reward,
        status: statuses.reward,
      },
      {
        id: "complete",
        label: "Complete",
        description: descriptions.complete,
        status: statuses.complete,
      },
    ];
  }, [flowState, isPurchase]);

  // Don't render if idle
  if (flowState === "idle") {
    return null;
  }

  // SUCCESS STATE: Show the celebratory receipt view
  if (flowState === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-sm mx-auto"
      >
        {/* Success card with glassmorphism */}
        <div
          className="relative overflow-hidden rounded-3xl backdrop-blur-xl border"
          style={{
            backgroundColor: colors.surface.card,
            borderColor: colors.surface.cardBorder,
            boxShadow: effects.shadow.elevated,
          }}
        >
          {/* Success gradient background */}
          <div
            className="absolute inset-x-0 top-0 h-48 pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, ${colors.success.bg} 0%, ${colors.success.bg}33 50%, transparent 100%)`,
            }}
          />

          {/* Celebratory particles effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {PARTICLE_POSITIONS.map((pos, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{ backgroundColor: colors.success.glow }}
                initial={{
                  x: "50%",
                  y: "30%",
                  scale: 0,
                  opacity: 0,
                }}
                animate={{
                  x: pos.x,
                  y: pos.y,
                  scale: [0, 1, 0],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.2 + i * 0.1,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 p-6">
            <SuccessSummary
              title={isPurchase ? "Purchase Complete" : activityName ? "Access Granted" : "Payment Approved"}
              subtitle={
                isPurchase
                  ? "Credits added to your account"
                  : activityName
                    ? `Enjoy ${activityName}!`
                    : "Transaction successful"
              }
              rewardAmount={creditsAmount}
              rewardUnit="CR"
              remainingBalance={remainingBalance}
              txHash={txHash}
              chainId={chainId}
              onDismiss={onDismiss}
              variant={variant}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  // PROCESSING/ERROR STATES: Show the card with stepper
  const cardStatus = getCardStatus(flowState);
  const title = getTitle(flowState);
  const subtitle = getSubtitle(flowState, activityName);

  // No AnimatePresence here - parent component already handles transitions
  // Using key to trigger re-animation only on significant state changes
  return (
    <TransactionCard
      key={cardStatus} // Re-animate when status category changes
      status={cardStatus}
      title={title}
      subtitle={subtitle}
      amount={creditsAmount}
      amountUnit={isPurchase ? "USDC" : "CR"}
      amountLabel={isPurchase ? "Purchasing" : "Spending"}
      txHash={flowState === "error" ? txHash : undefined}
      chainId={chainId}
      error={error}
      onRetry={onRetry}
      onDismiss={onDismiss}
    >
      <TransactionStepper steps={steps} />
    </TransactionCard>
  );
}

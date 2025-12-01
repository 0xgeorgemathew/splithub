"use client";

import { useCallback, useEffect, useState } from "react";
import { POSAmountEntry } from "./POSAmountEntry";
import { POSHardwareFrame } from "./POSHardwareFrame";
import { POSTransactionDisplay } from "./POSTransactionDisplay";
import { CreditFlowState } from "~~/hooks/credits/useCreditPurchase";

export type POSState = "idle" | "sending" | "confirming" | "printing" | "success";

interface POSFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
  // Amount state
  amount: number;
  onAmountChange: (amount: number) => void;
  balance: number;
  // Transaction handlers
  onTap: () => void;
  onReset: () => void;
  // Hook state integration
  flowState: CreditFlowState;
  error?: string;
  txHash?: string | null;
  confirmations: number;
  targetConfirmations: number;
  blockNumber: string | null;
  creditsMinted: string | null;
  networkName: string;
}

// Map hook flow states to POS states
function mapFlowState(flowState: CreditFlowState): POSState {
  switch (flowState) {
    case "tapping":
    case "signing":
    case "submitting":
      return "sending";
    case "confirming":
      return "confirming";
    case "success":
      return "success";
    default:
      return "idle";
  }
}

// Haptic feedback helper
const triggerHaptic = (pattern: number | number[] = 10) => {
  if (typeof window !== "undefined" && window.navigator?.vibrate) {
    window.navigator.vibrate(pattern);
  }
};

export function POSFullScreen({
  isOpen,
  onClose,
  amount,
  onAmountChange,
  balance,
  onTap,
  onReset,
  flowState,
  error,
  txHash,
  confirmations,
  targetConfirmations,
  blockNumber,
  creditsMinted,
  networkName,
}: POSFullScreenProps) {
  const [prevFlowState, setPrevFlowState] = useState<CreditFlowState>("idle");

  const posState = mapFlowState(flowState);
  const isProcessing = flowState !== "idle" && flowState !== "error";
  const isIdle = flowState === "idle" || flowState === "error";

  // Haptic feedback on state changes
  useEffect(() => {
    if (flowState !== prevFlowState) {
      if (flowState === "submitting") {
        triggerHaptic(10);
      } else if (flowState === "confirming") {
        triggerHaptic(15);
      } else if (flowState === "success") {
        triggerHaptic([10, 50, 10, 50, 10]);
      }
      setPrevFlowState(flowState);
    }
  }, [flowState, prevFlowState]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const handleTap = useCallback(() => {
    if (isProcessing) return;
    triggerHaptic(10);
    onTap();
  }, [isProcessing, onTap]);

  const handleRetry = useCallback(() => {
    onReset();
  }, [onReset]);

  const handleDismiss = useCallback(() => {
    triggerHaptic(10);
    onReset();
    onClose();
  }, [onReset, onClose]);

  if (!isOpen) return null;

  return (
    <div className="pos-fullscreen" role="dialog" aria-modal="true" aria-label="Payment Terminal">
      {/* Dark backdrop - clicking closes when idle */}
      {isIdle && !isProcessing && (
        <button className="absolute inset-0 z-0" onClick={handleDismiss} aria-label="Close terminal" />
      )}

      <POSHardwareFrame state={posState}>
        {isIdle ? (
          <POSAmountEntry
            amount={amount}
            onAmountChange={onAmountChange}
            balance={balance}
            onSubmit={handleTap}
            disabled={isProcessing}
          />
        ) : (
          <POSTransactionDisplay
            flowState={flowState}
            txHash={txHash || null}
            confirmations={confirmations}
            targetConfirmations={targetConfirmations}
            blockNumber={blockNumber}
            networkName={networkName}
            creditsMinted={creditsMinted}
            amount={amount}
            error={error || null}
            onRetry={handleRetry}
            onDismiss={handleDismiss}
          />
        )}
      </POSHardwareFrame>
    </div>
  );
}

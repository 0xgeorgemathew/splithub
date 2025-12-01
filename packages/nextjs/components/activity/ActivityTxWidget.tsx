"use client";

import { useEffect, useState } from "react";
import { DotMatrixDisplay } from "./DotMatrixDisplay";
import { DotMatrixLine } from "./DotMatrixLine";
import { useTxEvents } from "~~/hooks/activity";

interface ActivityTxWidgetProps {
  txHash: string | null;
  creditsSpent: number;
  chainId: number;
  blockNumber?: string | null;
  networkName?: string;
  variant?: "amber" | "green";
  onComplete?: () => void;
}

export function ActivityTxWidget({
  txHash,
  creditsSpent,
  chainId,
  blockNumber,
  networkName,
  variant = "amber",
  onComplete,
}: ActivityTxWidgetProps) {
  const { events, currentPhase } = useTxEvents({
    txHash,
    chainId,
    creditsSpent,
    blockNumber,
    networkName,
  });

  const [displayVariant, setDisplayVariant] = useState<"amber" | "green">(variant);

  // Switch to green on complete
  useEffect(() => {
    if (currentPhase === "complete") {
      setDisplayVariant("green");
      onComplete?.();
    }
  }, [currentPhase, onComplete]);

  // Reset variant when txHash changes
  useEffect(() => {
    if (!txHash) {
      setDisplayVariant(variant);
    }
  }, [txHash, variant]);

  // Don't render if idle
  if (currentPhase === "idle" || events.length === 0) {
    return null;
  }

  return (
    <DotMatrixDisplay variant={displayVariant}>
      {events.map((event, i) => (
        <DotMatrixLine
          key={`${event.type}-${i}`}
          timestamp={event.timestamp}
          prefix={event.prefix}
          value={event.value}
          href={event.href}
          isAnimating={i === events.length - 1 && currentPhase !== "complete"}
          confirmations={event.type === "confirmation" ? event.confirmations : undefined}
          variant={event.type === "granted" ? "success" : "default"}
        />
      ))}

      {/* ARIA live region for screen readers - final message only */}
      <span role="status" aria-live="polite" className="sr-only">
        {currentPhase === "complete" && "Access granted. Welcome!"}
      </span>
    </DotMatrixDisplay>
  );
}

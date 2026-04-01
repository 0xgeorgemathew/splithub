"use client";

import { type SourceCardData, type SourceCardStatus } from "./jitUiCopy";
import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";

interface SourceScanGridProps {
  cards: SourceCardData[];
  scanIndex: number;
}

const statusStyles: Record<SourceCardStatus, string> = {
  queued: "opacity-30 border-base-300",
  checking: "opacity-90 border-warning/50",
  passed: "opacity-70 border-success/40",
  selected: "opacity-100 border-warning",
  rejected: "opacity-40 border-base-300",
  skipped: "opacity-20 border-base-300",
};

function CardIcon({ status }: { status: SourceCardStatus }) {
  if (status === "checking") {
    return <Loader2 className="w-3.5 h-3.5 text-warning animate-spin" />;
  }
  if (status === "selected" || status === "passed") {
    return <Check className="w-3.5 h-3.5 text-success" />;
  }
  if (status === "rejected") {
    return <X className="w-3.5 h-3.5 text-base-content/40" />;
  }
  return <span className="w-3.5 h-3.5 block" />;
}

export function SourceScanGrid({ cards, scanIndex }: SourceScanGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      {cards.map((card, i) => {
        const isScanning = i === scanIndex;
        const isResolved = ["passed", "selected", "rejected", "skipped"].includes(card.status);
        const isActive = isScanning || isResolved;
        const status = isActive ? card.status : "queued";
        const style = statusStyles[status];
        const isSelected = card.status === "selected";

        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07, duration: 0.25 }}
            className={`
              relative rounded-xl border p-2.5 transition-all duration-300
              ${style} ${card.bgColor}
              ${isSelected ? "ring-2 ring-warning/50 shadow-lg shadow-warning/10" : ""}
            `}
          >
            {/* Glow for selected */}
            {isSelected && (
              <motion.div
                className="absolute inset-0 rounded-xl"
                animate={{ opacity: [0.15, 0.3, 0.15] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  background: `radial-gradient(circle, var(--fallback-wa,oklch(var(--wa))) 0%, transparent 70%)`,
                  opacity: 0.12,
                }}
              />
            )}

            <div className="relative flex items-center justify-between mb-1">
              <span className={`text-[11px] font-semibold ${isActive ? card.color : "text-base-content/40"}`}>
                {card.label}
              </span>
              <CardIcon status={status} />
            </div>

            <div className="relative">
              {status === "queued" && <span className="text-[10px] text-base-content/25 font-mono">—</span>}
              {status === "checking" && (
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-[10px] text-base-content/50 font-mono"
                >
                  ···
                </motion.span>
              )}
              {(status === "passed" || status === "selected") && (
                <span className={`text-[11px] font-mono font-medium ${card.color}`}>{card.amount ?? "—"}</span>
              )}
              {status === "rejected" && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-base-content/30 font-mono">{card.amount ?? "—"}</span>
                  {card.reason && <span className="text-[9px] text-base-content/25 mt-0.5">{card.reason}</span>}
                </div>
              )}
              {status === "skipped" && <span className="text-[10px] text-base-content/20 font-mono">—</span>}
            </div>

            {card.apy && (status === "selected" || status === "rejected") && (
              <span
                className={`text-[9px] mt-0.5 inline-block ${status === "selected" ? "text-success" : "text-base-content/25"}`}
              >
                {card.apy} APY
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

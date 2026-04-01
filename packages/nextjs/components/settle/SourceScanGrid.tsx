"use client";

import { type SourceCardData, type SourceCardStatus } from "./jitUiCopy";
import { motion } from "framer-motion";
import { Check, Loader2, Sparkles, X } from "lucide-react";

interface SourceScanGridProps {
  cards: SourceCardData[];
  scanIndex: number;
}

const statusStyles: Record<SourceCardStatus, string> = {
  queued: "border-white/8 bg-white/[0.03] opacity-45",
  checking: "border-warning/35 bg-warning/[0.08] opacity-100 shadow-[0_0_28px_rgba(242,169,0,0.08)]",
  passed: "border-emerald-400/25 bg-emerald-400/[0.07] opacity-80",
  selected: "border-emerald-300/45 bg-emerald-400/[0.12] opacity-100 shadow-[0_0_36px_rgba(54,211,153,0.12)]",
  rejected: "border-white/10 bg-white/[0.02] opacity-55",
  skipped: "border-white/6 bg-transparent opacity-25",
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
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(242,169,0,0.16),_transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3.5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-base-content/45">
            <Sparkles className="h-3 w-3 text-warning" />
            Agent Scan
          </div>
          <h3 className="mt-2 text-[1.02rem] font-semibold text-base-content">Scanning resources</h3>
          <p className="mt-1 max-w-[15rem] text-[10px] leading-relaxed text-base-content/45">
            The agent is checking payment routes and reserve readiness.
          </p>
        </div>

        <motion.div
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="mt-1 flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-[10px] font-medium text-warning"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          Live
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-2">
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
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{
                opacity: 1,
                scale: isSelected ? 1.02 : 1,
                y: isSelected ? -2 : 0,
              }}
              transition={{ delay: i * 0.06, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={`relative overflow-hidden rounded-2xl border p-2.5 transition-all duration-300 ${style}`}
            >
              {isScanning && status === "checking" && (
                <motion.div
                  className="absolute inset-y-0 left-[-35%] w-[35%] bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ["0%", "330%"] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                />
              )}

              {isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  animate={{ opacity: [0.18, 0.34, 0.18] }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
                  style={{ background: "radial-gradient(circle at top, rgba(54,211,153,0.28), transparent 68%)" }}
                />
              )}

              {isSelected && (
                <div className="absolute right-2 top-2 rounded-full border border-emerald-400/25 bg-emerald-400/12 p-1">
                  <Check className="h-3 w-3 text-emerald-300" strokeWidth={3} />
                </div>
              )}

              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className={`block text-[11px] font-semibold ${isActive ? card.color : "text-base-content/35"}`}>
                    {card.label}
                  </span>
                  <span className="mt-1 block text-[9px] uppercase tracking-[0.18em] text-base-content/30">
                    {status === "checking" && "Checking"}
                    {status === "selected" && "Selected"}
                    {status === "rejected" && "Skipped"}
                    {status === "passed" && "Ready"}
                    {status === "queued" && "Queued"}
                    {status === "skipped" && "Idle"}
                  </span>
                </div>
                <CardIcon status={status} />
              </div>

              <div className="relative mt-3">
                {status === "queued" && <span className="font-mono text-[10px] text-base-content/25">Waiting</span>}
                {status === "checking" && (
                  <motion.span
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    className="font-mono text-[10px] text-base-content/55"
                  >
                    evaluating...
                  </motion.span>
                )}
                {(status === "passed" || status === "selected") && (
                  <div className="flex items-end justify-between gap-2">
                    <span className={`font-mono text-[11px] font-medium ${card.color}`}>{card.amount ?? "available"}</span>
                    {card.apy && <span className="text-[9px] text-emerald-300/80">{card.apy} APY</span>}
                  </div>
                )}
                {status === "rejected" && (
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] text-base-content/30">{card.amount ?? "standby"}</span>
                    {card.reason && <span className="text-[9px] leading-relaxed text-base-content/25">{card.reason}</span>}
                  </div>
                )}
                {status === "skipped" && <span className="font-mono text-[10px] text-base-content/20">standby</span>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

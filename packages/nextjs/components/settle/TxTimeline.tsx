"use client";

import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { type TimelineStep } from "./types";

interface TxTimelineProps {
  steps: TimelineStep[];
  explorerBaseUrl: string;
}

export function TxTimeline({ steps, explorerBaseUrl }: TxTimelineProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const status = step.status ?? "complete";
        const isActive = status === "active";
        const isComplete = status === "complete";
        const isError = status === "error";
        const showDetail = isActive || isError;
        const dotClassName = isError
          ? "bg-error/15 border border-error/30"
          : isComplete
            ? "bg-emerald-400/15 border border-emerald-400/30"
            : isActive
              ? "bg-warning/15 border border-warning/30"
              : "bg-base-200 border border-white/10";
        const lineClassName = isComplete ? "bg-emerald-400/20" : isError ? "bg-error/20" : "bg-white/8";

        return (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12, duration: 0.25 }}
            className="flex items-start gap-1.5"
          >
            <div className="flex flex-col items-center pt-0.5">
              <div className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full ${dotClassName}`}>
                {isComplete && <Check className="h-2 w-2 text-emerald-300" strokeWidth={3} />}
                {isActive && <Loader2 className="h-2 w-2 animate-spin text-warning" strokeWidth={2.5} />}
                {isError && <X className="h-2 w-2 text-error" strokeWidth={3} />}
              </div>
              {!isLast && <div className={`mt-0.5 h-4 w-px ${lineClassName}`} />}
            </div>

            <div
              className={`flex-1 rounded-lg border px-2 py-1.25 backdrop-blur-sm transition-all duration-300 ${
                isComplete
                  ? "border-emerald-400/20 bg-emerald-400/8"
                  : isActive
                    ? "border-warning/30 bg-warning/8 shadow-[0_0_30px_rgba(242,169,0,0.08)]"
                    : isError
                      ? "border-error/25 bg-error/8"
                      : "border-white/8 bg-base-200/70"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={`text-[11px] font-semibold ${
                      isComplete
                        ? "text-base-content"
                        : isActive
                          ? "text-warning"
                          : isError
                            ? "text-error"
                            : "text-base-content/60"
                    }`}
                  >
                    {step.label}
                  </p>
                  {showDetail && step.detail && (
                    <p className="mt-0.5 text-[8px] leading-relaxed text-base-content/45">{step.detail}</p>
                  )}
                </div>
                {step.amount && (
                  <span className="rounded-full border border-white/10 bg-black/10 px-1.5 py-0.5 text-[8px] font-mono font-medium text-base-content/75">
                    {step.amount}
                  </span>
                )}
              </div>

              {step.txHash && explorerBaseUrl && (
                <a
                  href={`${explorerBaseUrl}/tx/${step.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex text-[8px] font-mono text-primary/80 hover:text-primary hover:underline"
                >
                  view tx
                </a>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

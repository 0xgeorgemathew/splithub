"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { type TimelineStep } from "./types";

interface TxTimelineProps {
  steps: TimelineStep[];
  explorerBaseUrl: string;
}

export function TxTimeline({ steps, explorerBaseUrl }: TxTimelineProps) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12, duration: 0.25 }}
            className="flex items-start gap-2.5"
          >
            {/* Dot + line */}
            <div className="flex flex-col items-center pt-0.5">
              <div className="w-4 h-4 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-2.5 h-2.5 text-success" strokeWidth={3} />
              </div>
              {!isLast && <div className="w-px h-4 bg-success/20" />}
            </div>

            {/* Content */}
            <div className="flex items-baseline gap-1.5 pb-1">
              <span className="text-[11px] text-base-content/70">{step.label}</span>
              {step.amount && (
                <span className="text-[11px] font-mono font-medium text-base-content">{step.amount}</span>
              )}
              {step.txHash && (
                <a
                  href={`${explorerBaseUrl}/tx/${step.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary hover:underline font-mono"
                >
                  view
                </a>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

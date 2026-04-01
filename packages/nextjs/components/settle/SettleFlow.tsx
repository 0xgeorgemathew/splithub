"use client";

import { PaymentStatus, PaymentStatusIndicator } from "./PaymentStatusIndicator";
import { SourceScanGrid } from "./SourceScanGrid";
import { TxTimeline } from "./TxTimeline";
import { useSettleFlow } from "./hooks/useSettleFlow";
import { getJitUiCopy } from "./jitUiCopy";
import { SettleFlowProps } from "./types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Coins, Wallet, X } from "lucide-react";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

export function SettleFlow({ params, onSuccess, onError, onClose }: SettleFlowProps) {
  const { targetNetwork } = useTargetNetwork();
  const {
    flowState,
    uiPhase,
    statusMessage,
    jitReasoning: _jitReasoning,
    jitFundingSource,
    sourceCards,
    scanIndex,
    timelineSteps,
    error,
    symbol,
    isConnected,
    canInitiate,
    initiateSettle,
  } = useSettleFlow({
    params,
    onSuccess,
    onError,
  });
  const jitUiCopy = getJitUiCopy(jitFundingSource);

  const getPaymentStatus = (): PaymentStatus => {
    if (flowState === "success") return "success";
    if (["preparing", "tapping", "submitting", "confirming"].includes(flowState)) return "processing";
    return "idle";
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-base-100 mb-3 shadow-md">
          <Wallet className="w-7 h-7 text-base-content/50" />
        </div>
        <p className="text-base-content/50 text-center text-sm">Connect your wallet to settle</p>
      </div>
    );
  }

  const paymentStatus = getPaymentStatus();
  const selectedCard = sourceCards.find(c => c.status === "selected");
  const activeSource = selectedCard ?? sourceCards.find(card => card.id === "aave");
  const isScanning = uiPhase === "scan";
  const isReasoning = uiPhase === "reasoning";
  const isWorkflowVisible = uiPhase === "actions" || uiPhase === "success";
  const isSuccess = flowState === "success";

  return (
    <div className="flex w-full flex-col items-center pt-0.5">
      <div className="mb-1.5 flex min-h-[2.75rem] items-center justify-center sm:min-h-[4rem]">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="amount"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-baseline justify-center gap-1.5"
            >
              <span className="text-4xl font-black font-mono tabular-nums text-base-content tracking-tight">
                {params.amount}
              </span>
              <span className="text-lg font-medium text-base-content/40">{symbol || "USDC"}</span>
            </motion.div>
          ) : (
            <motion.div
              key="success-info"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <h3 className="mb-1 text-lg font-bold text-base-content">Payment Complete</h3>
              <div className="flex items-center justify-center gap-1.5 rounded-full border border-success/30 bg-base-100 px-2.5 py-0.75">
                <Coins className="h-3 w-3 text-success" />
                <span className="text-[11px] font-semibold text-base-content">
                  {params.amount} {symbol || "tokens"} sent
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-2 flex items-center gap-2 rounded-full border border-error/30 bg-error/10 px-3 py-1.5 max-w-[280px]"
          >
            <AlertCircle className="w-3.5 h-3.5 text-error flex-shrink-0" />
            <span className="text-[11px] text-error">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-1.5 sm:mb-2.5">
        <PaymentStatusIndicator
          status={paymentStatus}
          processingText={statusMessage || "Processing..."}
          onTap={initiateSettle}
          disabled={!canInitiate}
          size="sm"
        />
      </div>

      <div className="w-full">
        <AnimatePresence mode="wait">
          {!isScanning && !isReasoning && !isWorkflowVisible && (
            <motion.div
              key="idle-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24 }}
              className="flex w-full flex-col rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(242,169,0,0.14),_transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.2)]"
            >
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-warning">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                  Agent Pay active
                </div>
              </div>

              <p className="mt-2 text-center text-[10px] leading-relaxed text-base-content/45">
                Tap once and the agent will prepare the payment route.
              </p>
            </motion.div>
          )}

          {isScanning && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <SourceScanGrid cards={sourceCards} scanIndex={scanIndex} />
            </motion.div>
          )}

          {isReasoning && (
            <motion.div
              key="reasoning"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full flex-col rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(54,211,153,0.12),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Aave selected
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                  Live via Aave
                </div>
              </div>

              <h3 className="mt-2 text-base font-semibold leading-tight text-base-content">Reserve route locked</h3>
              <p className="mt-1 text-[10px] leading-relaxed text-base-content/45">
                The agent has found the cleanest payment route.
              </p>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {(jitUiCopy?.badges ?? ["Best yield", "Fast withdraw", "Reserve ready"]).map(badge => (
                  <span
                    key={badge}
                    className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-base-content/70"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {isWorkflowVisible && (
            <motion.div
              key="workflow"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(54,211,153,0.12),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
            >
              <div className="mb-1 flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    {activeSource?.label ?? "Aave"} selected
                  </div>
                  <h3 className="mt-1 text-[15px] font-semibold leading-tight text-base-content">
                    {isSuccess ? "Payment completed" : "Agent is executing the route"}
                  </h3>
                  <p className="mt-0.5 max-w-[15rem] text-[10px] leading-relaxed text-base-content/45">
                    {jitUiCopy?.detail ?? "The agent is stepping through the payment flow in sequence."}
                  </p>
                </div>

                {activeSource && (
                  <div
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${activeSource.borderColor} ${activeSource.bgColor} ${activeSource.color}`}
                  >
                    Live via {activeSource.label}
                  </div>
                )}
              </div>

              <div className="min-h-0 overflow-hidden">
                {timelineSteps.length > 0 && (
                  <TxTimeline steps={timelineSteps} explorerBaseUrl={targetNetwork.blockExplorers?.default.url ?? ""} />
                )}
              </div>

              {isSuccess && (
                <div className="mt-1.5 flex items-center justify-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[13px] font-semibold text-base-content">
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                  {params.amount} {symbol || "USDC"} sent
                </div>
              )}

              {isSuccess && onClose && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-1.5 bg-base-300/50 hover:bg-base-300 rounded-full text-sm font-medium text-base-content transition-colors mx-auto"
                >
                  <X className="w-4 h-4" />
                  Close
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

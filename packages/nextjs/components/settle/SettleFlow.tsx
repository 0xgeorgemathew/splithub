"use client";

import { PaymentStatus, PaymentStatusIndicator } from "./PaymentStatusIndicator";
import { SourceScanGrid } from "./SourceScanGrid";
import { TxTimeline } from "./TxTimeline";
import { useSettleFlow } from "./hooks/useSettleFlow";
import { getJitUiCopy } from "./jitUiCopy";
import { SettleFlowProps } from "./types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Coins, Fuel, Wallet, X } from "lucide-react";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

export function SettleFlow({ params, onSuccess, onError, onClose }: SettleFlowProps) {
  const { targetNetwork } = useTargetNetwork();
  const {
    flowState,
    statusMessage,
    jitReasoning: _jitReasoning,
    jitFundingSource,
    jitPreparation,
    sourceCards,
    scanIndex,
    timelineSteps,
    error,
    txHash,
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

  // Find selected source for phase 2 highlight
  const selectedCard = sourceCards.find(c => c.status === "selected");
  const isScanning = flowState === "preparing";
  const isResolved = flowState === "submitting" || flowState === "confirming";
  const isSuccess = flowState === "success";

  return (
    <div className="flex flex-col items-center pt-1">
      {/* Top badges */}
      <div className="h-8 flex items-center justify-center">
        <AnimatePresence>
          {paymentStatus === "idle" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap justify-center gap-2"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-base-300/50 rounded-full">
                <Coins className="w-3.5 h-3.5 text-base-content/70" />
                <span className="text-xs font-medium text-base-content">{symbol || "USDC"}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-base-300/50 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <Fuel className="w-3.5 h-3.5 text-base-content/70" />
                <span className="text-xs font-medium text-base-content">Direct</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Amount / success info */}
      <div className="h-16 flex items-center justify-center my-2">
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
              <h3 className="text-xl font-bold mb-1 text-base-content">Payment Complete</h3>
              <div className="flex items-center justify-center gap-2 px-3 py-1 bg-base-100 border border-success/30 rounded-full">
                <Coins className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-semibold text-base-content">
                  {params.amount} {symbol || "tokens"} sent
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error slot */}
      <div className="h-8 flex items-center justify-center">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-error/10 border border-error/30 rounded-full max-w-[280px]"
            >
              <AlertCircle className="w-3.5 h-3.5 text-error flex-shrink-0" />
              <span className="text-error text-[11px]">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Payment button */}
      <div className="my-2">
        <PaymentStatusIndicator
          status={paymentStatus}
          processingText={statusMessage || "Processing..."}
          onTap={initiateSettle}
          disabled={!canInitiate}
          size="sm"
        />
      </div>

      {/* Fixed-height info area: source cards → selected → success timeline */}
      <div className="w-full min-h-[180px] mt-1">
        <AnimatePresence mode="wait">
          {/* Phase 1: Source Scanning */}
          {isScanning && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <SourceScanGrid cards={sourceCards} scanIndex={scanIndex} />
            </motion.div>
          )}

          {/* Phase 2: Source Selected */}
          {isResolved && selectedCard && (
            <motion.div
              key="selected"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {/* Selected source highlight */}
              <div className={`rounded-xl border ${selectedCard.borderColor} ${selectedCard.bgColor} p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedCard.color}`}>
                    {selectedCard.label}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                </div>
                <p className="text-xs text-base-content/70">
                  {jitFundingSource === "chip_balance" && "NO TOP-UP NEEDED"}
                  {jitFundingSource === "agent_liquid" && "USING AGENT RESERVE"}
                  {jitFundingSource === "aave_withdraw" && "WITHDRAWING FROM AAVE"}
                  {jitFundingSource === "insufficient_backing" && "NO SAFE ROUTE FOUND"}
                </p>
                {jitUiCopy && <p className="text-[11px] text-base-content/50 mt-1">{jitUiCopy.detail}</p>}
              </div>

              {/* Mini badges for other sources */}
              <div className="flex flex-wrap gap-1.5">
                {sourceCards
                  .filter(c => c.status !== "selected")
                  .map(c => (
                    <span
                      key={c.id}
                      className={`text-[9px] px-2 py-0.5 rounded-full border ${c.status === "rejected" ? "border-base-300 text-base-content/30" : "border-base-300 text-base-content/40"}`}
                    >
                      {c.label} {c.amount ?? "—"}
                    </span>
                  ))}
              </div>
            </motion.div>
          )}

          {/* Phase 3: Success Timeline */}
          {isSuccess && (
            <motion.div
              key="success-timeline"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Success header */}
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-base-content">
                  ${params.amount} {symbol || "USDC"} sent
                </span>
              </div>

              {/* TX Timeline */}
              {timelineSteps.length > 0 && (
                <TxTimeline steps={timelineSteps} explorerBaseUrl={targetNetwork.blockExplorers?.default.url ?? ""} />
              )}

              {/* Source badges */}
              <div className="flex flex-wrap gap-1.5">
                {selectedCard && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${selectedCard.bgColor} ${selectedCard.color} border ${selectedCard.borderColor}`}
                  >
                    Via {selectedCard.label}
                  </span>
                )}
              </div>

              {/* Close button */}
              {onClose && (
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

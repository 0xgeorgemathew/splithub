"use client";

import { PaymentStatus, PaymentStatusIndicator } from "./PaymentStatusIndicator";
import { useSettleFlow } from "./hooks/useSettleFlow";
import { SettleFlowProps } from "./types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Coins, Fuel, Wallet, X } from "lucide-react";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

export function SettleFlow({ params, onSuccess, onError, onClose }: SettleFlowProps) {
  const { targetNetwork } = useTargetNetwork();
  const { flowState, error, txHash, symbol, isConnected, paymentsAddress, initiateSettle } = useSettleFlow({
    params,
    onSuccess,
    onError,
  });

  // Map flowState to PaymentStatus for the indicator
  const getPaymentStatus = (): PaymentStatus => {
    if (flowState === "success") return "success";
    if (["tapping", "signing", "submitting", "confirming"].includes(flowState)) return "processing";
    return "idle";
  };

  // Get processing text based on current flow state
  const getProcessingText = (): string => {
    switch (flowState) {
      case "tapping":
        return "Tap your chip...";
      case "signing":
        return "Authorizing...";
      case "submitting":
        return "Broadcasting...";
      case "confirming":
        return "Confirming...";
      default:
        return "Processing...";
    }
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

  return (
    <div className="flex flex-col items-center pt-1 min-h-[280px]">
      {/* Top Section - Fixed height for badges/spacer */}
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
                <span className="text-xs font-medium text-base-content">Gasless</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Amount/Success Section - Fixed height */}
      <div className="h-16 flex items-center justify-center my-2">
        <AnimatePresence mode="wait">
          {paymentStatus !== "success" ? (
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

      {/* Error Message - Fixed height slot */}
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

      {/* Morphing Payment Status Indicator */}
      <div className="my-2">
        <PaymentStatusIndicator
          status={paymentStatus}
          processingText={getProcessingText()}
          onTap={initiateSettle}
          disabled={!paymentsAddress}
          size="sm"
        />
      </div>

      {/* Bottom Section - Fixed height for tx link & close button */}
      <div className="h-16 flex items-center justify-center">
        <AnimatePresence>
          {paymentStatus === "success" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center gap-2"
            >
              {txHash && (
                <a
                  href={`${targetNetwork.blockExplorers?.default.url}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline font-mono"
                >
                  View transaction →
                </a>
              )}

              {onClose && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-1.5 bg-base-300/50 hover:bg-base-300 rounded-full text-sm font-medium text-base-content transition-colors"
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

"use client";

import { PaymentStatus, PaymentStatusIndicator } from "./PaymentStatusIndicator";
import { useSettleFlow } from "./hooks/useSettleFlow";
import { SettleFlowProps } from "./types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Coins, ExternalLink, Nfc, Wallet, X } from "lucide-react";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

export function SettleFlow({ params, onSuccess, onError, onClose }: SettleFlowProps) {
  const { targetNetwork } = useTargetNetwork();
  const { flowState, statusMessage, error, txHash, symbol, isConnected, canInitiate, initiateSettle } = useSettleFlow({
    params,
    onSuccess,
    onError,
  });

  const getPaymentStatus = (): PaymentStatus => {
    if (flowState === "success") return "success";
    if (["preparing", "tapping", "signing", "submitting", "confirming"].includes(flowState)) return "processing";
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

  const isSuccess = flowState === "success";
  const explorerUrl = targetNetwork.blockExplorers?.default.url;

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
          status={getPaymentStatus()}
          processingText={statusMessage || "Processing..."}
          onTap={initiateSettle}
          disabled={!canInitiate}
          size="sm"
        />
      </div>

      <div className="flex w-full flex-col items-center gap-2 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-3">
        {isSuccess ? (
          <>
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-base-content">
              <CheckCircle className="h-3.5 w-3.5 text-success" />
              Paid from your wallet
            </div>
            {txHash && explorerUrl && (
              <a
                href={`${explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-base-content/50 hover:text-primary"
              >
                {txHash.slice(0, 10)}…{txHash.slice(-6)}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="mt-1 flex items-center gap-2 px-4 py-1.5 bg-base-300/50 hover:bg-base-300 rounded-full text-sm font-medium text-base-content transition-colors"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            )}
          </>
        ) : (
          <p className="m-0 flex items-center gap-1.5 text-center text-[11px] leading-relaxed text-base-content/50">
            <Nfc className="h-3.5 w-3.5 text-primary/70" />
            Tap your chip to authorize. The payment moves straight from your wallet.
          </p>
        )}
      </div>
    </div>
  );
}

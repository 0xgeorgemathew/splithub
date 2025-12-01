"use client";

import { useSettleFlow } from "./hooks/useSettleFlow";
import { FLOW_STEPS, SettleFlowProps } from "./types";
import { AlertCircle, Check, Coins, Fuel, Loader2, Nfc, User, Wallet } from "lucide-react";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

export function SettleFlow({ params, onSuccess, onError }: SettleFlowProps) {
  const { targetNetwork } = useTargetNetwork();
  const {
    flowState,
    statusMessage,
    error,
    txHash,
    symbol,
    isConnected,
    paymentsAddress,
    handleSettle,
    reset,
    getCurrentStepIndex,
  } = useSettleFlow({ params, onSuccess, onError });

  const isProcessing = ["tapping", "signing", "submitting", "confirming"].includes(flowState);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4 shadow-md">
          <Wallet className="w-8 h-8 text-base-content/50" />
        </div>
        <p className="text-base-content/50 text-center">Connect your wallet to settle</p>
      </div>
    );
  }

  if (flowState === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-8 fade-in-up">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success/20 mb-6 success-glow">
          <Check className="w-12 h-12 text-success" strokeWidth={3} />
        </div>
        <h3 className="text-2xl font-bold mb-3 text-base-content">Payment Complete</h3>

        {/* Amount sent */}
        <div className="flex items-center gap-2 px-4 py-2 bg-base-100 border border-success/30 rounded-full mb-4">
          <Coins className="w-4 h-4 text-success" />
          <span className="text-sm font-semibold text-base-content">
            {params.amount} {symbol || "tokens"} sent
          </span>
        </div>

        {/* Transaction hash */}
        {txHash && (
          <a
            href={`${targetNetwork.blockExplorers?.default.url}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline font-mono mb-6"
          >
            View transaction →
          </a>
        )}

        <button
          onClick={reset}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-content font-medium rounded-full transition-all duration-200 shadow-md"
        >
          Pay Again
        </button>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {FLOW_STEPS.map((step, idx) => {
            const currentIdx = getCurrentStepIndex();
            const isComplete = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    isComplete
                      ? "bg-success text-success-content"
                      : isCurrent
                        ? "bg-primary text-primary-content"
                        : "bg-base-300 text-base-content/50"
                  }`}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                {idx < FLOW_STEPS.length - 1 && (
                  <div className={`w-6 h-0.5 ${isComplete ? "bg-success" : "bg-base-300"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Animated Processing Indicator */}
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
          {flowState === "tapping" && (
            <>
              <div className="nfc-pulse-ring" />
              <div className="nfc-pulse-ring" style={{ animationDelay: "0.5s" }} />
            </>
          )}
        </div>

        <h3 className="text-lg font-semibold mb-1 text-base-content">{statusMessage}</h3>
        <p className="text-base-content/50 text-sm">
          {flowState === "tapping" && "Hold device near chip"}
          {flowState === "signing" && "Authorizing payment"}
          {flowState === "submitting" && "Broadcasting to network"}
          {flowState === "confirming" && "Waiting for confirmation"}
        </p>
      </div>
    );
  }

  // Idle State - Main Payment UI
  return (
    <div className="flex flex-col items-center py-4">
      {/* Info Pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {/* Recipient Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full">
          <User className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-base-content">
            {params.recipient.slice(0, 6)}...{params.recipient.slice(-4)}
          </span>
        </div>

        {/* Token Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-primary/50 rounded-full">
          <Coins className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-base-content">{symbol || "USDT"}</span>
          <span className="w-1.5 h-1.5 bg-success rounded-full" />
        </div>

        {/* Gasless Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full">
          <Fuel className="w-3.5 h-3.5 text-success" />
          <span className="text-xs font-medium text-success">Gasless</span>
        </div>
      </div>

      {/* Amount Display */}
      <div className="text-center mb-8">
        <p className="text-6xl font-bold text-base-content mb-1">{params.amount}</p>
        <p className="text-base-content/50 text-sm">{symbol || "tokens"}</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-error/10 border border-error/30 rounded-full mb-6 max-w-xs">
          <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
          <span className="text-error text-xs">{error}</span>
        </div>
      )}

      {/* 3D NFC Chip Button */}
      <div className="relative">
        {/* Pulse rings */}
        <div className="nfc-pulse-ring" />
        <div className="nfc-pulse-ring" />
        <div className="nfc-pulse-ring" />

        <button
          onClick={handleSettle}
          disabled={!paymentsAddress}
          className="nfc-chip-btn flex flex-col items-center justify-center text-primary-content disabled:opacity-50"
        >
          <Nfc className="w-12 h-12 mb-1" />
          <span className="text-sm font-bold">Tap to Pay</span>
        </button>
      </div>
    </div>
  );
}

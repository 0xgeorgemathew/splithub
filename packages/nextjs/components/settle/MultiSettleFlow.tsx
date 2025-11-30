"use client";

import { useMultiSettleFlow } from "./hooks/useMultiSettleFlow";
import { MultiSettleFlowProps } from "./types";
import { AlertCircle, Check, Coins, Fuel, Loader2, Nfc, User, Users, Wallet } from "lucide-react";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

export function MultiSettleFlow({ recipient, token, amounts, memo, onSuccess, onError }: MultiSettleFlowProps) {
  const { targetNetwork } = useTargetNetwork();
  const {
    flowState,
    participants,
    currentSigningIndex,
    allSigned,
    signedCount,
    totalCount,
    error,
    txHash,
    symbol,
    isConnected,
    paymentsAddress,
    totalAmount,
    signSlot,
    submitBatch,
    reset,
  } = useMultiSettleFlow({
    recipient,
    token,
    amounts,
    onSuccess,
    onError,
  });

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4 shadow-md">
          <Wallet className="w-8 h-8 text-base-content/50" />
        </div>
        <p className="text-base-content/50 text-center">Connect your wallet to continue</p>
      </div>
    );
  }

  // Success state
  if (flowState === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-8 fade-in-up">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success/20 mb-6 success-glow">
          <Check className="w-12 h-12 text-success" strokeWidth={3} />
        </div>
        <h3 className="text-2xl font-bold mb-3 text-base-content">All Payments Complete</h3>

        <div className="flex items-center gap-2 px-4 py-2 bg-base-100 border border-success/30 rounded-full mb-4">
          <Coins className="w-4 h-4 text-success" />
          <span className="text-sm font-semibold text-base-content">
            {totalAmount} {symbol || "tokens"} from {totalCount} participants
          </span>
        </div>

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
          Start New Batch
        </button>
      </div>
    );
  }

  // Submitting/Confirming state
  if (flowState === "submitting" || flowState === "confirming") {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-1 text-base-content">
          {flowState === "submitting" ? "Submitting Batch..." : "Confirming..."}
        </h3>
        <p className="text-base-content/50 text-sm">
          {flowState === "submitting"
            ? `Sending ${totalCount} payments atomically`
            : "Waiting for blockchain confirmation"}
        </p>
      </div>
    );
  }

  // Error state at batch level
  if (flowState === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-error/20 mb-4">
          <AlertCircle className="w-8 h-8 text-error" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-base-content">Batch Failed</h3>
        <p className="text-base-content/60 text-sm mb-4 text-center max-w-xs">{error}</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-content font-medium rounded-full"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Collecting signatures state
  return (
    <div className="flex flex-col items-center py-4">
      {/* Header Info */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full">
          <User className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-base-content">
            To: {recipient.slice(0, 6)}...{recipient.slice(-4)}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-primary/50 rounded-full">
          <Coins className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-base-content">{symbol || "Token"}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full">
          <Fuel className="w-3.5 h-3.5 text-success" />
          <span className="text-xs font-medium text-success">Gasless</span>
        </div>
      </div>

      {memo && <p className="text-base-content/70 text-sm text-center mb-4 max-w-xs">{memo}</p>}

      {/* Total Amount */}
      <div className="text-center mb-4">
        <p className="text-4xl font-bold text-base-content mb-1">{totalAmount}</p>
        <p className="text-base-content/50 text-sm">
          {symbol || "tokens"} total from {totalCount} participants
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-base-content">
          {signedCount} / {totalCount} signed
        </span>
        {allSigned && <Check className="w-4 h-4 text-success" />}
      </div>

      {/* Participant Slots */}
      <div className="w-full max-w-sm space-y-3 mb-6">
        {participants.map((participant, idx) => (
          <div
            key={participant.id}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              participant.status === "signed"
                ? "bg-success/10 border-success/30"
                : participant.status === "signing"
                  ? "bg-primary/10 border-primary/50"
                  : participant.status === "error"
                    ? "bg-error/10 border-error/30"
                    : "bg-base-100 border-base-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  participant.status === "signed"
                    ? "bg-success text-success-content"
                    : participant.status === "signing"
                      ? "bg-primary text-primary-content"
                      : participant.status === "error"
                        ? "bg-error text-error-content"
                        : "bg-base-300 text-base-content"
                }`}
              >
                {participant.status === "signed" ? (
                  <Check className="w-4 h-4" />
                ) : participant.status === "signing" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  idx + 1
                )}
              </div>
              <div>
                {participant.status === "signed" && participant.payer ? (
                  <p className="text-sm font-medium text-base-content">
                    {participant.payer.slice(0, 6)}...{participant.payer.slice(-4)}
                  </p>
                ) : (
                  <p className="text-sm font-medium text-base-content/50">Slot {idx + 1}</p>
                )}
                <p className="text-xs text-base-content/50">
                  {participant.expectedAmount} {symbol || "tokens"}
                </p>
              </div>
            </div>

            {participant.status === "waiting" && (
              <button
                onClick={() => signSlot(idx)}
                disabled={currentSigningIndex !== null}
                className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-content text-xs font-medium rounded-full disabled:opacity-50"
              >
                <Nfc className="w-3.5 h-3.5 inline mr-1" />
                Tap to Sign
              </button>
            )}

            {participant.status === "signing" && <span className="text-xs text-primary font-medium">Tapping...</span>}

            {participant.status === "error" && (
              <button
                onClick={() => signSlot(idx)}
                disabled={currentSigningIndex !== null}
                className="px-3 py-1.5 bg-error hover:bg-error/90 text-error-content text-xs font-medium rounded-full disabled:opacity-50"
              >
                Retry
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-error/10 border border-error/30 rounded-full mb-4 max-w-xs">
          <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
          <span className="text-error text-xs">{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={submitBatch}
        disabled={!allSigned || !paymentsAddress}
        className={`px-8 py-3 font-semibold rounded-full transition-all duration-200 shadow-lg ${
          allSigned
            ? "bg-success hover:bg-success/90 text-success-content"
            : "bg-base-300 text-base-content/50 cursor-not-allowed"
        }`}
      >
        {allSigned ? "Submit All Payments" : `Waiting for ${totalCount - signedCount} more signatures`}
      </button>
    </div>
  );
}

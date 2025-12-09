"use client";

import { useSettleFlow } from "./hooks/useSettleFlow";
import { FLOW_STEPS, SettleFlowProps } from "./types";
import { motion } from "framer-motion";
import { AlertCircle, Check, Coins, Fuel, Loader2, Nfc, Wallet } from "lucide-react";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

// Framer motion variants for smooth pulse rings - 3 rings with staggered timing for continuous overlap
const pulseRingVariants = {
  animate: (i: number) => ({
    scale: [1, 1.25, 1.5],
    opacity: [0, 0.35, 0],
    transition: {
      duration: 2.1,
      repeat: Infinity,
      delay: i * 0.7,
      ease: "easeOut",
    },
  }),
};

// NFC button breathing animation
const nfcButtonVariants = {
  idle: {
    scale: 1,
    boxShadow: "0 8px 32px rgba(242, 169, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3)",
  },
  hover: {
    scale: 1.03,
    boxShadow: "0 12px 40px rgba(242, 169, 0, 0.5), 0 6px 20px rgba(0, 0, 0, 0.35)",
    transition: { duration: 0.2 },
  },
  tap: {
    scale: 0.97,
    boxShadow: "0 4px 16px rgba(242, 169, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.25)",
    transition: { duration: 0.1 },
  },
};

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
      <div className="flex flex-col items-center justify-center py-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-base-100 mb-3 shadow-md">
          <Wallet className="w-7 h-7 text-base-content/50" />
        </div>
        <p className="text-base-content/50 text-center text-sm">Connect your wallet to settle</p>
      </div>
    );
  }

  if (flowState === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4"
        >
          <Check className="w-8 h-8 text-success" strokeWidth={3} />
        </motion.div>
        <h3 className="text-xl font-bold mb-2 text-base-content">Payment Complete</h3>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-success/30 rounded-full mb-3">
          <Coins className="w-3.5 h-3.5 text-success" />
          <span className="text-xs font-semibold text-base-content">
            {params.amount} {symbol || "tokens"} sent
          </span>
        </div>

        {txHash && (
          <a
            href={`${targetNetwork.blockExplorers?.default.url}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline font-mono mb-4"
          >
            View transaction →
          </a>
        )}

        <button
          onClick={reset}
          className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-content text-sm font-medium rounded-full transition-colors"
        >
          Pay Again
        </button>
      </motion.div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-4">
        {/* Compact Progress Steps */}
        <div className="flex items-center gap-1.5 mb-5">
          {FLOW_STEPS.map((step, idx) => {
            const currentIdx = getCurrentStepIndex();
            const isComplete = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={step.key} className="flex items-center">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isComplete ? "#36d399" : isCurrent ? "#f2a900" : "#3d4451",
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    isComplete ? "text-success-content" : isCurrent ? "text-black" : "text-base-content/50"
                  }`}
                >
                  {isComplete ? <Check className="w-3 h-3" /> : idx + 1}
                </motion.div>
                {idx < FLOW_STEPS.length - 1 && (
                  <div className={`w-4 h-0.5 ${isComplete ? "bg-success" : "bg-base-300"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Compact Processing Indicator */}
        <div className="relative mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center"
          >
            <Loader2 className="w-8 h-8 text-primary" />
          </motion.div>
          {flowState === "tapping" && (
            <>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  custom={i}
                  variants={pulseRingVariants}
                  animate="animate"
                  className="absolute inset-[-8px] rounded-full border-2 border-warning/60"
                />
              ))}
            </>
          )}
        </div>

        <h3 className="text-base font-semibold mb-0.5 text-base-content">{statusMessage}</h3>
        <p className="text-base-content/50 text-xs">
          {flowState === "tapping" && "Hold device near chip"}
          {flowState === "signing" && "Authorizing payment"}
          {flowState === "submitting" && "Broadcasting to network"}
          {flowState === "confirming" && "Waiting for confirmation"}
        </p>
      </div>
    );
  }

  // Idle State - Compact Payment UI
  return (
    <div className="flex flex-col items-center pt-1">
      {/* Compact Info Pills */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-base-100 border border-primary/50 rounded-full">
          <Coins className="w-3 h-3 text-primary" />
          <span className="text-[11px] font-medium text-base-content">{symbol || "USDC"}</span>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 bg-base-100 border border-base-300 rounded-full">
          <Fuel className="w-3 h-3 text-success" />
          <span className="text-[11px] font-medium text-success">Gasless</span>
        </div>
      </div>

      {/* Amount Display */}
      <div className="text-center mb-3">
        <p className="text-3xl font-bold text-base-content">{params.amount}</p>
        <p className="text-base-content/50 text-[10px]">{symbol || "USDC"}</p>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 bg-error/10 border border-error/30 rounded-full mb-4 max-w-[280px]"
        >
          <AlertCircle className="w-3.5 h-3.5 text-error flex-shrink-0" />
          <span className="text-error text-[11px]">{error}</span>
        </motion.div>
      )}

      {/* NFC Button with Framer Motion */}
      <div className="relative">
        {/* Animated pulse rings - 3 for smooth continuous overlap */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            custom={i}
            variants={pulseRingVariants}
            animate="animate"
            className="absolute inset-[-8px] rounded-full border border-warning/40 pointer-events-none"
          />
        ))}

        <motion.button
          onClick={handleSettle}
          disabled={!paymentsAddress}
          variants={nfcButtonVariants}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          className="relative w-[100px] h-[100px] rounded-full flex flex-col items-center justify-center text-primary-content disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(145deg, #f2a900, #d99400)",
            border: "2px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Inner ring decoration */}
          <div className="absolute inset-[5px] rounded-full border border-white/15 pointer-events-none" />

          <Nfc className="w-7 h-7 mb-0.5" />
          <span className="text-[10px] font-bold">Tap to Pay</span>
        </motion.button>
      </div>
    </div>
  );
}

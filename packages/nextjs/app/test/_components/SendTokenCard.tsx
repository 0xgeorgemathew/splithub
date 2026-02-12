"use client";

import { Status } from "./types";
import { motion } from "framer-motion";
import { Loader2, Nfc, Send } from "lucide-react";

// Hardcoded token: USDC on Base Sepolia (6 decimals)
const HARDCODED_TOKEN_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

interface SendTokenCardProps {
  tokenAddress: string;
  tokenTo: string;
  tokenAmount: string;
  status: Status;
  isLoading: boolean;
  onTokenAddressChange: (value: string) => void;
  onTokenToChange: (value: string) => void;
  onTokenAmountChange: (value: string) => void;
  onSend: () => void;
}

export function SendTokenCard({
  tokenAddress,
  tokenTo,
  tokenAmount,
  status,
  isLoading,
  onTokenAddressChange,
  onTokenToChange,
  onTokenAmountChange,
  onSend,
}: SendTokenCardProps) {
  // Auto-fill token address on mount if empty
  const effectiveTokenAddress = tokenAddress || HARDCODED_TOKEN_ADDRESS;

  return (
    <motion.div
      className="card bg-base-100 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="card-body">
        <h2 className="card-title text-lg">
          <Send className="w-5 h-5" />
          Send Token (USDC)
        </h2>

        {/* Token info display - hardcoded */}
        <div className="bg-base-200 rounded-lg p-2 text-xs">
          <div className="text-base-content/60">Token Address (Base Sepolia USDC)</div>
          <div className="font-mono break-all select-all text-base-content/80">{HARDCODED_TOKEN_ADDRESS}</div>
          <div className="text-base-content/50 mt-1">Decimals: 6</div>
        </div>

        <div className="space-y-3">
          {/* Hidden input to maintain form state compatibility */}
          <input
            type="hidden"
            value={effectiveTokenAddress}
            onChange={() => onTokenAddressChange(HARDCODED_TOKEN_ADDRESS)}
          />

          <input
            type="text"
            placeholder="Recipient address (0x...)"
            className="input input-bordered w-full text-sm"
            value={tokenTo}
            onChange={e => onTokenToChange(e.target.value)}
            disabled={isLoading}
          />
          <input
            type="text"
            placeholder="Amount (USDC)"
            className="input input-bordered w-full text-sm"
            value={tokenAmount}
            onChange={e => onTokenAmountChange(e.target.value)}
            disabled={isLoading}
          />
          <button
            className="btn btn-primary w-full gap-2"
            onClick={() => {
              // Ensure token address is set before sending
              if (!tokenAddress) {
                onTokenAddressChange(HARDCODED_TOKEN_ADDRESS);
              }
              onSend();
            }}
            disabled={isLoading || !tokenTo || !tokenAmount}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {status === "building" && "Building TX..."}
                {status === "signing" && "Tap to Sign..."}
                {status === "broadcasting" && "Broadcasting..."}
              </>
            ) : (
              <>
                <Nfc className="w-5 h-5" />
                Tap to Send Token
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

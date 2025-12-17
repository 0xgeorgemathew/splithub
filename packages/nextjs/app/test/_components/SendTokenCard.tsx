"use client";

import { Status } from "./types";
import { motion } from "framer-motion";
import { Loader2, Nfc, Send } from "lucide-react";

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
          Send Token
        </h2>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Token address (0x...)"
            className="input input-bordered w-full text-sm"
            value={tokenAddress}
            onChange={e => onTokenAddressChange(e.target.value)}
            disabled={isLoading}
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
            placeholder="Amount"
            className="input input-bordered w-full text-sm"
            value={tokenAmount}
            onChange={e => onTokenAmountChange(e.target.value)}
            disabled={isLoading}
          />
          <button
            className="btn btn-primary w-full gap-2"
            onClick={onSend}
            disabled={isLoading || !tokenAddress || !tokenTo || !tokenAmount}
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

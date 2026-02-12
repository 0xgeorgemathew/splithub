"use client";

import { Status } from "./types";
import { motion } from "framer-motion";
import { Loader2, Nfc, Send } from "lucide-react";

interface SendEthCardProps {
  ethTo: string;
  ethAmount: string;
  status: Status;
  isLoading: boolean;
  onEthToChange: (value: string) => void;
  onEthAmountChange: (value: string) => void;
  onSend: () => void;
}

export function SendEthCard({
  ethTo,
  ethAmount,
  status,
  isLoading,
  onEthToChange,
  onEthAmountChange,
  onSend,
}: SendEthCardProps) {
  return (
    <motion.div
      className="card bg-base-100 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="card-body">
        <h2 className="card-title text-lg">
          <Send className="w-5 h-5" />
          Send ETH
        </h2>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Recipient address (0x...)"
            className="input input-bordered w-full text-sm"
            value={ethTo}
            onChange={e => onEthToChange(e.target.value)}
            disabled={isLoading}
          />
          <input
            type="text"
            placeholder="Amount (ETH)"
            className="input input-bordered w-full text-sm"
            value={ethAmount}
            onChange={e => onEthAmountChange(e.target.value)}
            disabled={isLoading}
          />
          <button
            className="btn btn-primary w-full gap-2"
            onClick={onSend}
            disabled={isLoading || !ethTo || !ethAmount}
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
                Tap to Send ETH
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

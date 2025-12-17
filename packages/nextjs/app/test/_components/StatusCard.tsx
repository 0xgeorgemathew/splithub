"use client";

import { Status } from "./types";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle } from "lucide-react";

interface StatusCardProps {
  status: Status;
  txHash: string | null;
  error: string | null;
  onDismiss: () => void;
}

export function StatusCard({ status, txHash, error, onDismiss }: StatusCardProps) {
  if (status !== "success" && status !== "error") {
    return null;
  }

  return (
    <motion.div
      className={`card shadow-lg ${status === "success" ? "bg-success/10" : "bg-error/10"}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="card-body">
        {status === "success" ? (
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-success">Transaction Sent!</p>
              {txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline break-all"
                >
                  {txHash}
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-error flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-error">Error</p>
              <p className="text-sm text-base-content/70 break-words">{error}</p>
            </div>
          </div>
        )}
        <button className="btn btn-sm btn-ghost mt-2" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}

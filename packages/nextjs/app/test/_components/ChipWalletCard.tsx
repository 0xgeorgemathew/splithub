"use client";

import { Status } from "./types";
import { motion } from "framer-motion";
import { Loader2, Nfc, Wallet } from "lucide-react";

interface ChipWalletCardProps {
  chipAddress: `0x${string}` | null;
  chipBalance: string | null;
  allChipAddresses: Record<string, string>;
  status: Status;
  isLoading: boolean;
  onConnect: () => void;
}

export function ChipWalletCard({
  chipAddress,
  chipBalance,
  allChipAddresses,
  status,
  isLoading,
  onConnect,
}: ChipWalletCardProps) {
  return (
    <motion.div className="card bg-base-100 shadow-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="card-body">
        <h2 className="card-title text-lg">
          <Wallet className="w-5 h-5" />
          Chip Wallet
        </h2>

        {chipAddress ? (
          <div className="space-y-3">
            {/* Active Address (Slot 1) - Full */}
            <div className="bg-base-200 rounded-lg p-2">
              <div className="text-xs text-base-content/60 mb-1">Active (Slot 1)</div>
              <div className="font-mono text-xs break-all select-all">{chipAddress}</div>
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-base-content/60">Balance:</span>
              <span className="font-semibold">{chipBalance ?? "..."} ETH</span>
            </div>

            {/* All Slots */}
            {Object.keys(allChipAddresses).length > 1 && (
              <div className="border-t border-base-300 pt-2">
                <div className="text-xs text-base-content/60 mb-2">All Chip Addresses</div>
                <div className="space-y-1">
                  {Object.entries(allChipAddresses).map(([slot, addr]) => (
                    <div key={slot} className="flex items-start gap-2 text-xs">
                      <span className="text-base-content/50 w-12 flex-shrink-0">Slot {slot}:</span>
                      <span className="font-mono break-all select-all text-base-content/70">{addr}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="btn btn-sm btn-outline w-full mt-2" onClick={onConnect} disabled={isLoading}>
              Refresh
            </button>
          </div>
        ) : (
          <button className="btn btn-primary w-full gap-2" onClick={onConnect} disabled={status === "connecting"}>
            {status === "connecting" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Tap NFC Chip...
              </>
            ) : (
              <>
                <Nfc className="w-5 h-5" />
                Tap to Connect
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

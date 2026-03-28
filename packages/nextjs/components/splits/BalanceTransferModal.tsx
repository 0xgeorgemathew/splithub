"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, ExternalLink, Loader2, Nfc, X } from "lucide-react";
import { baseSepolia } from "~~/lib/baseSepolia";

type TransferDirection = "cardToWallet" | "walletToCard";
type TransferState = "idle" | "transferring" | "success" | "error";

interface BalanceTransferModalProps {
  isOpen: boolean;
  direction: TransferDirection;
  maxBalance?: number;
  isNfcSigning?: boolean;
  onClose: () => void;
  onConfirm: (amount: string) => Promise<{ txHash: string }>;
}

export function BalanceTransferModal({
  isOpen,
  direction,
  maxBalance = 0,
  isNfcSigning = false,
  onClose,
  onConfirm,
}: BalanceTransferModalProps) {
  const [amount, setAmount] = useState("");
  const [state, setState] = useState<TransferState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const isCardToWallet = direction === "cardToWallet";
  const title = isCardToWallet ? "Move to Wallet" : "Move to Card";
  const accentClass = isCardToWallet ? "text-rose-400" : "text-sky-300";
  const Icon = isCardToWallet ? ArrowUpRight : ArrowDownLeft;
  const parsedAmount = Number(amount);
  const exceedsBalance = parsedAmount > maxBalance && maxBalance > 0;

  const availableLabel = useMemo(() => {
    return maxBalance.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [maxBalance]);

  const reset = useCallback(() => {
    setAmount("");
    setState("idle");
    setError(null);
    setTxHash(null);
  }, []);

  const handleClose = useCallback(() => {
    if (state === "transferring") {
      return;
    }

    reset();
    onClose();
  }, [state, reset, onClose]);

  const handleConfirm = useCallback(async () => {
    if (!amount || parsedAmount <= 0) {
      return;
    }

    if (exceedsBalance) {
      setState("error");
      setError("Amount exceeds available balance.");
      return;
    }

    setState("transferring");
    setError(null);
    setTxHash(null);

    try {
      const result = await onConfirm(amount);
      setTxHash(result.txHash);
      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Transfer failed");
    }
  }, [amount, exceedsBalance, onConfirm, parsedAmount]);

  const canConfirm = parsedAmount > 0 && !exceedsBalance && state !== "transferring";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2"
          >
            <div
              className="rounded-3xl border border-white/[0.08] p-6 shadow-2xl"
              style={{
                background: "linear-gradient(160deg, rgba(22,22,22,0.98) 0%, rgba(10,10,10,0.98) 100%)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              {state === "success" ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/12">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  </div>
                  <h3 className="mb-1 text-xl font-bold text-white">Transfer Complete</h3>
                  <p className="mb-5 text-sm text-white/60">
                    ${Number(amount).toFixed(2)} moved to {isCardToWallet ? "wallet" : "card"}
                  </p>

                  {txHash && (
                    <a
                      href={`${baseSepolia.blockExplorers.default.url}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-6 inline-flex items-center gap-1.5 text-sm text-sky-300 hover:text-sky-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Basescan
                    </a>
                  )}

                  <button
                    onClick={handleClose}
                    className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-400"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                          isCardToWallet ? "bg-rose-500/12" : "bg-sky-400/12"
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${accentClass}`} />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/35">USDC Transfer</p>
                        <h2 className="text-lg font-semibold text-white">{title}</h2>
                      </div>
                    </div>

                    <button
                      onClick={handleClose}
                      disabled={state === "transferring"}
                      className="rounded-xl p-2 text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/70 disabled:opacity-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-white/35">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-white/35">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        disabled={state === "transferring"}
                        className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] py-4 pl-10 pr-24 text-2xl font-bold text-white outline-none transition-colors placeholder:text-white/15 focus:border-white/15"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setAmount(maxBalance > 0 ? maxBalance.toFixed(2) : "")}
                        disabled={state === "transferring" || maxBalance <= 0}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition-colors hover:bg-white/[0.07] disabled:opacity-40"
                      >
                        Max
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-white/40">Available: ${availableLabel}</p>
                  </div>

                  {isCardToWallet && (
                    <div className="mb-4 rounded-2xl border border-amber-400/15 bg-amber-400/8 p-3 text-sm text-amber-100/80">
                      <p>Card to wallet transfers require Base Sepolia ETH on the card for gas.</p>
                      <p className="mt-2 text-amber-100/70">
                        After you confirm, keep the Halo card near your phone so NFC signing can complete.
                      </p>
                    </div>
                  )}

                  {state === "transferring" && isCardToWallet && (
                    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-300/15 bg-sky-300/10 p-3">
                      <Nfc className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                      <div className="text-sm text-sky-100/85">
                        <p className="font-medium">{isNfcSigning ? "Waiting for NFC tap" : "Preparing transfer"}</p>
                        <p className="mt-1 text-sky-100/70">
                          {isNfcSigning
                            ? "Hold the card near your phone to sign the transfer."
                            : "Building the transfer request before the NFC signing step."}
                        </p>
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {state === "error" && error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3"
                      >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                        <span className="text-sm text-rose-200/90">{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {exceedsBalance && state !== "error" && (
                    <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200/90">
                      Amount exceeds the available balance on this source.
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      disabled={state === "transferring"}
                      className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 font-medium text-white/70 transition-colors hover:bg-white/[0.05] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={!canConfirm}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold transition-colors ${
                        canConfirm
                          ? isCardToWallet
                            ? "bg-rose-500 text-white hover:bg-rose-400"
                            : "bg-sky-400 text-slate-950 hover:bg-sky-300"
                          : "cursor-not-allowed bg-white/[0.05] text-white/25"
                      }`}
                    >
                      {state === "transferring" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {isCardToWallet ? (isNfcSigning ? "Awaiting NFC" : "Preparing") : "Confirming"}
                        </>
                      ) : (
                        <>
                          {isCardToWallet ? <Nfc className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          {isCardToWallet ? "Tap Card to Sign" : title}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

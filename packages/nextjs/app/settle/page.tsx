"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Coins, RefreshCw, User, Wallet } from "lucide-react";
import { type Address } from "viem";
import { useReadContract } from "wagmi";
import { PaymentStatus, PaymentStatusIndicator } from "~~/components/settle/PaymentStatusIndicator";
import { SourceScanGrid } from "~~/components/settle/SourceScanGrid";
import { TxTimeline } from "~~/components/settle/TxTimeline";
import { type TimelineStep } from "~~/components/settle/types";
import {
  type JitFundingSource,
  type SourceCardData,
  buildInitialSourceCards,
  getJitUiCopy,
  resolveSourceCards,
} from "~~/components/settle/jitUiCopy";
import { TOKENS } from "~~/config/tokens";
import { DEFAULT_AGENT_PAY_TEST_RECIPIENT } from "~~/constants/agentPay";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useCurrentUser } from "~~/hooks/useCurrentUser";
import { baseSepolia, createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { broadcastSignedChipTransaction, prepareRawChipTokenTransfer } from "~~/lib/chipTransactions";
import { dispatchClientRefreshEvents } from "~~/lib/clientTransactionUtils";
import { ERC20_ABI } from "~~/lib/contractAbis";
import { parseContractError } from "~~/utils/contractErrors";

// Hardcoded values
const RECIPIENT_ADDRESS = DEFAULT_AGENT_PAY_TEST_RECIPIENT;
const DEFAULT_TOKEN_ADDRESS = TOKENS.USDC;
const DEFAULT_AMOUNT = "1";
const SCAN_TICK_MS = 400;

type FlowState = "idle" | "preparing" | "tapping" | "submitting" | "confirming" | "success" | "error";

const waitForNextPaint = () =>
  new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

export default function SettlePage() {
  const { authenticated, user } = usePrivy();
  const { chipAddress } = useCurrentUser();
  const { signDigest } = useHaloChip();

  const address = user?.wallet?.address as `0x${string}` | undefined;
  const isConnected = authenticated && !!address;

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [jitReasoning, setJitReasoning] = useState("");
  const [jitReasoningSource, setJitReasoningSource] = useState<"llm" | "fallback" | null>(null);
  const [jitFundingSource, setJitFundingSource] = useState<JitFundingSource | null>(null);
  const [jitPreparation, setJitPreparation] = useState<{
    withdrewFromAave?: boolean;
    transferredToFundedWallet?: boolean;
    withdrawalTxHash?: string;
    transferTxHash?: string;
    shortfallUsd?: string;
    fundedWalletBalanceUsd?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const jitUiCopy = getJitUiCopy(jitFundingSource);

  // Simulated scanning state
  const [sourceCards, setSourceCards] = useState<SourceCardData[]>(buildInitialSourceCards());
  const [scanIndex, setScanIndex] = useState(-1);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read token decimals
  const { data: decimals } = useReadContract({
    address: DEFAULT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  // Read token symbol
  const { data: symbol } = useReadContract({
    address: DEFAULT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  // Start simulated scanning animation
  const startScanAnimation = useCallback(() => {
    const initial = buildInitialSourceCards();
    setSourceCards(initial);
    setScanIndex(0);

    initial[0] = { ...initial[0], status: "checking" };
    setSourceCards([...initial]);

    let idx = 0;
    scanTimerRef.current = setInterval(() => {
      idx++;
      if (idx >= initial.length) {
        if (scanTimerRef.current) clearInterval(scanTimerRef.current);
        return;
      }
      setSourceCards(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], status: "checking" };
        return next;
      });
      setScanIndex(idx);
    }, SCAN_TICK_MS);
  }, []);

  // Stop scanning and resolve cards from API result
  const resolveScan = useCallback((fundingSource: JitFundingSource, fundedWalletBalance?: string) => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    setSourceCards(prev =>
      resolveSourceCards(
        prev.map(c => ({ ...c, status: c.status === "queued" ? "rejected" : c.status })),
        fundingSource,
        {
          chipBalance: fundedWalletBalance ?? null,
          agentLiquid: null,
          aaveReserve: null,
          aaveApy: "4.20%",
          morphoApy: "0.35%",
        },
      ),
    );
    setScanIndex(-1);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, []);

  const handleSettle = async () => {
    setError("");
    setJitReasoning("");
    setJitReasoningSource(null);
    setJitFundingSource(null);
    setJitPreparation(null);
    setTxHash(null);

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (decimals === undefined) {
      setError("Could not read token decimals. Is this a valid ERC-20 token?");
      return;
    }

    if (!chipAddress) {
      setError("No registered chip found for this wallet");
      return;
    }

    try {
      const publicClient = createBaseSepoliaPublicClient();

      setFlowState("tapping");
      await waitForNextPaint();

      const prepared = await prepareRawChipTokenTransfer({
        publicClient,
        chipAddress: chipAddress as Address,
        tokenAddress: DEFAULT_TOKEN_ADDRESS,
        recipient: RECIPIENT_ADDRESS,
        amount: DEFAULT_AMOUNT,
        decimals,
      });

      const signed = await signDigest({ digest: prepared.digest });

      setFlowState("preparing");
      startScanAnimation();

      const prepareRes = await fetch("/api/vincent/prepare-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerWallet: address,
          limitWallet: address,
          fundingTargetWallet: chipAddress,
          tokenAddress: DEFAULT_TOKEN_ADDRESS,
          amount: DEFAULT_AMOUNT,
          decimals,
        }),
      });

      if (!prepareRes.ok) {
        const data = await prepareRes.json().catch(() => null);
        throw new Error(data?.error || "Failed to prepare wallet for tap");
      }

      const prepareData = (await prepareRes.json().catch(() => null)) as {
        fundingSource?: JitFundingSource;
        reasoning?: string;
        reasoningSource?: "llm" | "fallback";
        withdrewFromAave?: boolean;
        transferredToFundedWallet?: boolean;
        withdrawalTxHash?: string;
        transferTxHash?: string;
        shortfallUsd?: string;
        fundedWalletBalanceUsd?: string;
      } | null;

      const funding = prepareData?.fundingSource || null;
      setJitReasoning(prepareData?.reasoning || "");
      setJitReasoningSource(prepareData?.reasoningSource || null);
      setJitFundingSource(funding);
      setJitPreparation(prepareData ?? null);

      if (funding) {
        resolveScan(funding, prepareData?.fundedWalletBalanceUsd);
      }

      setFlowState("submitting");

      const result = await broadcastSignedChipTransaction({
        publicClient,
        chipAddress: chipAddress as Address,
        prepared,
        signed,
      });

      setFlowState("confirming");
      setTxHash(result.txHash);

      dispatchClientRefreshEvents({ balances: true, paymentRequests: true });

      setFlowState("success");
    } catch (err: any) {
      console.error("Settlement error:", err);
      setFlowState("error");
      setError(parseContractError(err) || "Settlement failed. Please try again.");
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    }
  };

  const getPaymentStatus = (): PaymentStatus => {
    if (flowState === "success") return "success";
    if (["preparing", "tapping", "submitting", "confirming"].includes(flowState)) return "processing";
    return "idle";
  };

  const getProcessingText = (): string => {
    switch (flowState) {
      case "tapping":
        return "Tap chip";
      case "preparing":
        return "Scanning sources";
      case "submitting":
        return jitFundingSource === "aave_withdraw"
          ? "Aave tops up chip"
          : jitFundingSource === "agent_liquid"
            ? "Funding chip"
            : "Paying now";
      case "confirming":
        return "Confirming";
      default:
        return "Processing...";
    }
  };

  const handleReset = () => {
    setFlowState("idle");
    setError("");
    setJitReasoning("");
    setJitReasoningSource(null);
    setJitFundingSource(null);
    setJitPreparation(null);
    setTxHash(null);
    setSourceCards(buildInitialSourceCards());
    setScanIndex(-1);
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);
  };

  const paymentStatus = getPaymentStatus();
  const isProcessing = ["preparing", "tapping", "submitting", "confirming"].includes(flowState);
  const isScanning = flowState === "preparing";
  const isResolved = flowState === "submitting" || flowState === "confirming";
  const isSuccess = flowState === "success";
  const selectedCard = sourceCards.find(c => c.status === "selected");

  // Build timeline steps
  const timelineSteps: TimelineStep[] = [];
  if (isSuccess && jitPreparation) {
    if (jitPreparation.withdrewFromAave) {
      timelineSteps.push({
        label: "Aave withdraw",
        amount: jitPreparation.shortfallUsd ? `$${jitPreparation.shortfallUsd}` : undefined,
        txHash: jitPreparation.withdrawalTxHash,
      });
    }
    if (jitPreparation.transferredToFundedWallet) {
      timelineSteps.push({
        label: "Fund chip wallet",
        amount: jitPreparation.shortfallUsd ? `$${jitPreparation.shortfallUsd}` : undefined,
        txHash: jitPreparation.transferTxHash,
      });
    }
    timelineSteps.push({
      label: "Payment sent",
      txHash: txHash ?? undefined,
    });
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4 shadow-md">
              <Wallet className="w-8 h-8 text-base-content/50" />
            </div>
            <p className="text-base-content/50 text-center">Connect your wallet to settle</p>
          </div>
        ) : (
          <div className="flex min-h-[calc(100vh-120px)] flex-col justify-center gap-4">
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body gap-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-base-content/60">Test payment</p>
                    <h1 className="text-3xl font-semibold text-base-content leading-none">
                      {DEFAULT_AMOUNT} {symbol || "Token"}
                    </h1>
                  </div>
                  <div className="badge badge-outline badge-primary">Direct chip pay</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-base-300 bg-base-200/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-base-content/50">Recipient</p>
                    <div className="mt-1 flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <p className="font-medium text-base-content">
                        {RECIPIENT_ADDRESS.slice(0, 6)}...{RECIPIENT_ADDRESS.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-base-300 bg-base-200/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-base-content/50">Payer</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" />
                      <p className="font-medium text-base-content">{symbol || "Token"} via chip</p>
                    </div>
                  </div>
                </div>

                <PaymentStatusIndicator
                  status={paymentStatus}
                  processingText={getProcessingText()}
                  onTap={handleSettle}
                  disabled={!chipAddress}
                  size="lg"
                />

                {/* Fixed-height info area: source cards → selected → success timeline */}
                <div className="min-h-[180px]">
                  <AnimatePresence mode="wait">
                    {/* Phase 1: Source Scanning */}
                    {isScanning && (
                      <motion.div
                        key="scanning"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SourceScanGrid cards={sourceCards} scanIndex={scanIndex} />
                      </motion.div>
                    )}

                    {/* Phase 2: Source Selected */}
                    {isResolved && selectedCard && (
                      <motion.div
                        key="selected"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2"
                      >
                        <div className={`rounded-xl border ${selectedCard.borderColor} ${selectedCard.bgColor} p-3`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedCard.color}`}>
                              {selectedCard.label}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                          </div>
                          <p className="text-xs text-base-content/70">
                            {jitFundingSource === "chip_balance" && "NO TOP-UP NEEDED"}
                            {jitFundingSource === "agent_liquid" && "USING AGENT RESERVE"}
                            {jitFundingSource === "aave_withdraw" && "WITHDRAWING FROM AAVE"}
                            {jitFundingSource === "insufficient_backing" && "NO SAFE ROUTE FOUND"}
                          </p>
                          {jitUiCopy && <p className="text-[11px] text-base-content/50 mt-1">{jitUiCopy.detail}</p>}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {sourceCards
                            .filter(c => c.status !== "selected")
                            .map(c => (
                              <span
                                key={c.id}
                                className={`text-[9px] px-2 py-0.5 rounded-full border ${c.status === "rejected" ? "border-base-300 text-base-content/30" : "border-base-300 text-base-content/40"}`}
                              >
                                {c.label} {c.amount ?? "—"}
                              </span>
                            ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Phase 3: Success Timeline */}
                    {isSuccess && (
                      <motion.div
                        key="success-timeline"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span className="text-sm font-semibold text-base-content">
                            ${DEFAULT_AMOUNT} {symbol || "USDC"} sent
                          </span>
                        </div>

                        {timelineSteps.length > 0 && (
                          <TxTimeline steps={timelineSteps} explorerBaseUrl={baseSepolia.blockExplorers.default.url} />
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          {selectedCard && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full ${selectedCard.bgColor} ${selectedCard.color} border ${selectedCard.borderColor}`}
                            >
                              Via {selectedCard.label}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 rounded-2xl border border-error/30 bg-error/10 px-4 py-3"
                >
                  <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                  <span className="text-error text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {(paymentStatus === "success" || !!txHash || (!isProcessing && flowState !== "idle")) && (
              <div className="flex flex-col items-center gap-3">
                {txHash && (
                  <a
                    href={`${baseSepolia.blockExplorers.default.url}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline font-mono"
                  >
                    View transaction
                  </a>
                )}

                {(paymentStatus === "success" || flowState === "error") && (
                  <button onClick={handleReset} className="btn btn-outline rounded-full">
                    <RefreshCw className="h-4 w-4" />
                    New payment
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

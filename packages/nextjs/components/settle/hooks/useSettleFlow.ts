/**
 * Settlement flow hook for single-payer NFC payments
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type JitFundingSource, type SourceCardData, buildInitialSourceCards, resolveSourceCards } from "../jitUiCopy";
import { FlowState, PaymentParams, type TimelineStep } from "../types";
import { type Address } from "viem";
import { useReadContract } from "wagmi";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useCurrentUser } from "~~/hooks/useCurrentUser";
import { useWalletAddress } from "~~/hooks/useWalletAddress";
import { createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { broadcastSignedChipTransaction, prepareRawChipTokenTransfer } from "~~/lib/chipTransactions";
import { dispatchClientRefreshEvents } from "~~/lib/clientTransactionUtils";
import { ERC20_ABI } from "~~/lib/contractAbis";
import { parseContractError } from "~~/utils/contractErrors";

interface UseSettleFlowOptions {
  params: PaymentParams;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

interface JitPreparationResult {
  fundingSource?: JitFundingSource;
  reasoning?: string;
  reasoningSource?: "llm" | "fallback";
  withdrewFromAave?: boolean;
  transferredToFundedWallet?: boolean;
  withdrawalTxHash?: string;
  transferTxHash?: string;
  shortfallUsd?: string;
  fundedWalletBalanceUsd?: string;
  error?: string;
}

interface UseSettleFlowReturn {
  flowState: FlowState;
  isProcessing: boolean;
  statusMessage: string;
  jitReasoning: string;
  jitReasoningSource: "llm" | "fallback" | null;
  jitFundingSource: JitFundingSource | null;
  jitPreparation: JitPreparationResult | null;
  sourceCards: SourceCardData[];
  scanIndex: number;
  error: string;
  txHash: string | null;
  symbol: string | undefined;
  decimals: number | undefined;
  isConnected: boolean;
  canInitiate: boolean;
  initiateSettle: () => Promise<void>;
  reset: () => void;
  timelineSteps: TimelineStep[];
  getCurrentStepIndex: () => number;
}

const SCAN_TICK_MS = 400;

export function useSettleFlow({ params, onSuccess, onError }: UseSettleFlowOptions): UseSettleFlowReturn {
  const { walletAddress, isConnected } = useWalletAddress();
  const { chipAddress } = useCurrentUser();
  const { signDigest } = useHaloChip();

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [jitReasoning, setJitReasoning] = useState("");
  const [jitReasoningSource, setJitReasoningSource] = useState<"llm" | "fallback" | null>(null);
  const [jitFundingSource, setJitFundingSource] = useState<JitFundingSource | null>(null);
  const [jitPreparation, setJitPreparation] = useState<JitPreparationResult | null>(null);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  // Simulated scanning state
  const [sourceCards, setSourceCards] = useState<SourceCardData[]>(buildInitialSourceCards());
  const [scanIndex, setScanIndex] = useState(-1);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const publicClient = useMemo(() => createBaseSepoliaPublicClient(), []);

  const { data: decimals } = useReadContract({
    address: params.token,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  const { data: symbol } = useReadContract({
    address: params.token,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  // Start simulated scanning animation
  const startScanAnimation = useCallback(() => {
    const initial = buildInitialSourceCards();
    setSourceCards(initial);
    setScanIndex(0);

    // Mark first card as checking
    initial[0] = { ...initial[0], status: "checking" };
    setSourceCards([...initial]);

    let idx = 0;
    scanTimerRef.current = setInterval(() => {
      idx++;
      if (idx >= initial.length) {
        if (scanTimerRef.current) clearInterval(scanTimerRef.current);
        return;
      }
      // Mark current as checking, previous stay as-is (they'll be resolved when API returns)
      setSourceCards(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], status: "checking" };
        return next;
      });
      setScanIndex(idx);
    }, SCAN_TICK_MS);
  }, []);

  // Stop scanning and resolve cards from API result
  const resolveScan = useCallback((fundingSource: JitFundingSource, prep: JitPreparationResult) => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    setSourceCards(prev =>
      resolveSourceCards(
        prev.map(c => ({ ...c, status: c.status === "queued" ? "rejected" : c.status })),
        fundingSource,
        {
          chipBalance: prep.fundedWalletBalanceUsd ?? null,
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

  const handleSettle = useCallback(async () => {
    setError("");
    setJitReasoning("");
    setJitReasoningSource(null);
    setJitFundingSource(null);
    setJitPreparation(null);
    setTxHash(null);

    if (!isConnected || !walletAddress) {
      setError("Please connect your wallet first");
      return;
    }

    if (!chipAddress) {
      setError("No registered chip found for this wallet");
      return;
    }

    if (decimals === undefined) {
      setError("Could not read token decimals. Is this a valid ERC-20 token?");
      return;
    }

    try {
      setFlowState("tapping");
      setStatusMessage("Tap chip");

      const prepared = await prepareRawChipTokenTransfer({
        publicClient,
        chipAddress: chipAddress as Address,
        tokenAddress: params.token,
        recipient: params.recipient,
        amount: params.amount,
        decimals,
      });

      const signed = await signDigest({ digest: prepared.digest });

      setFlowState("preparing");
      setStatusMessage("Scanning sources");
      startScanAnimation();

      const prepareRes = await fetch("/api/vincent/prepare-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerWallet: walletAddress,
          limitWallet: walletAddress,
          fundingTargetWallet: chipAddress,
          tokenAddress: params.token,
          amount: params.amount,
          decimals,
        }),
      });

      const prepareData = (await prepareRes.json().catch(() => null)) as JitPreparationResult | null;

      if (!prepareRes.ok) {
        throw new Error(prepareData?.error || "Failed to prepare chip wallet");
      }

      const funding = prepareData?.fundingSource || null;
      setJitReasoning(prepareData?.reasoning || "");
      setJitReasoningSource(prepareData?.reasoningSource || null);
      setJitFundingSource(funding);
      setJitPreparation(prepareData ?? null);

      // Resolve the scan animation with actual results
      if (funding) {
        resolveScan(funding, prepareData ?? {});
      }

      if (prepareData?.withdrewFromAave && prepareData?.transferredToFundedWallet) {
        setStatusMessage("Aave tops up chip");
      } else if (prepareData?.transferredToFundedWallet) {
        setStatusMessage("Funding chip");
      } else {
        setStatusMessage("No top-up needed");
      }

      setFlowState("submitting");
      setStatusMessage("Paying now");

      const result = await broadcastSignedChipTransaction({
        publicClient,
        chipAddress: chipAddress as Address,
        prepared,
        signed,
      });

      setFlowState("confirming");
      setStatusMessage("Confirming");
      setTxHash(result.txHash);

      dispatchClientRefreshEvents({ balances: true, paymentRequests: true });

      setFlowState("success");
      setStatusMessage("Sent");

      onSuccess?.(result.txHash);
    } catch (err) {
      console.error("Settlement error:", err);
      setFlowState("error");
      setError(parseContractError(err) || "Settlement failed. Please try again.");
      setStatusMessage("");
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      onError?.(err instanceof Error ? err : new Error("Settlement failed"));
    }
  }, [
    chipAddress,
    decimals,
    isConnected,
    onError,
    onSuccess,
    params,
    publicClient,
    resolveScan,
    signDigest,
    startScanAnimation,
    walletAddress,
  ]);

  const reset = useCallback(() => {
    setFlowState("idle");
    setError("");
    setStatusMessage("");
    setJitReasoning("");
    setJitReasoningSource(null);
    setJitFundingSource(null);
    setJitPreparation(null);
    setTxHash(null);
    setSourceCards(buildInitialSourceCards());
    setScanIndex(-1);
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);
  }, []);

  const getCurrentStepIndex = useCallback(() => {
    const stepMap: Record<string, number> = {
      tapping: 0,
      preparing: 1,
      submitting: 2,
      confirming: 3,
    };
    return stepMap[flowState] ?? -1;
  }, [flowState]);

  const isProcessing = flowState !== "idle" && flowState !== "success" && flowState !== "error";

  // Compute timeline steps from preparation data
  const timelineSteps: TimelineStep[] = useMemo(() => {
    if (flowState !== "success" || !jitPreparation) return [];
    const steps: TimelineStep[] = [];
    if (jitPreparation.withdrewFromAave) {
      steps.push({
        label: "Aave withdraw",
        amount: jitPreparation.shortfallUsd ? `$${jitPreparation.shortfallUsd}` : undefined,
        txHash: jitPreparation.withdrawalTxHash,
      });
    }
    if (jitPreparation.transferredToFundedWallet) {
      steps.push({
        label: "Fund chip wallet",
        amount: jitPreparation.shortfallUsd ? `$${jitPreparation.shortfallUsd}` : undefined,
        txHash: jitPreparation.transferTxHash,
      });
    }
    steps.push({
      label: "Payment sent",
      txHash: txHash ?? undefined,
    });
    return steps;
  }, [flowState, jitPreparation, txHash]);

  return {
    flowState,
    isProcessing,
    statusMessage,
    jitReasoning,
    jitReasoningSource,
    jitFundingSource,
    jitPreparation,
    sourceCards,
    scanIndex,
    timelineSteps,
    error,
    txHash,
    symbol,
    decimals,
    isConnected,
    canInitiate: !!chipAddress,
    initiateSettle: handleSettle,
    reset,
    getCurrentStepIndex,
  };
}

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
  uiPhase: "idle" | "scan" | "reasoning" | "actions" | "success";
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

const SCAN_TICK_MS = 1100;
const SCAN_HOLD_MS = 1700;
const REASONING_HOLD_MS = 2000;
const ACTION_STEP_MS = 650;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function buildWorkflowSteps(prep: JitPreparationResult | null, txHash: string | null = null): TimelineStep[] {
  const fundingSource = prep?.fundingSource;
  const amount = prep?.shortfallUsd ? `$${prep.shortfallUsd}` : undefined;

  if (fundingSource === "chip_balance") {
    return [
      {
        label: "Payment sent",
        detail: "Chip balance is already ready.",
        txHash: txHash ?? undefined,
        status: "pending",
      },
    ];
  }

  if (fundingSource === "agent_liquid") {
    return [
      {
        label: "Funding chip",
        detail: "Liquid reserve is moving into the payment wallet.",
        amount,
        txHash: prep?.transferTxHash,
        status: "pending",
      },
      {
        label: "Payment sent",
        detail: "Chip transfer will broadcast as soon as funding lands.",
        txHash: txHash ?? undefined,
        status: "pending",
      },
    ];
  }

  return [
    {
      label: "Withdrawing from Aave",
      detail: "Pulling the exact shortfall from reserve.",
      amount,
      txHash: prep?.withdrawalTxHash,
      status: "pending",
    },
    {
      label: "Funding chip",
      detail: "Fresh USDC is moving into the payment wallet.",
      amount,
      txHash: prep?.transferTxHash,
      status: "pending",
    },
    {
      label: "Payment sent",
      detail: "Chip transfer broadcasts once funding is ready.",
      txHash: txHash ?? undefined,
      status: "pending",
    },
  ];
}

export function useSettleFlow({ params, onSuccess, onError }: UseSettleFlowOptions): UseSettleFlowReturn {
  const { walletAddress, isConnected } = useWalletAddress();
  const { chipAddress } = useCurrentUser();
  const { signDigest } = useHaloChip();

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [uiPhase, setUiPhase] = useState<"idle" | "scan" | "reasoning" | "actions" | "success">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [jitReasoning, setJitReasoning] = useState("");
  const [jitReasoningSource, setJitReasoningSource] = useState<"llm" | "fallback" | null>(null);
  const [jitFundingSource, setJitFundingSource] = useState<JitFundingSource | null>(null);
  const [jitPreparation, setJitPreparation] = useState<JitPreparationResult | null>(null);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>([]);

  const [sourceCards, setSourceCards] = useState<SourceCardData[]>(buildInitialSourceCards());
  const [scanIndex, setScanIndex] = useState(-1);
  const animationRunRef = useRef(0);

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

  const startScanAnimation = useCallback(async (runId: number) => {
    const scriptedCards = buildInitialSourceCards();

    setUiPhase("scan");
    setTimelineSteps([]);
    setScanIndex(0);

    scriptedCards[0] = { ...scriptedCards[0], status: "checking" };
    setSourceCards([...scriptedCards]);

    await wait(SCAN_TICK_MS);
    if (animationRunRef.current !== runId) return;

    scriptedCards[0] = { ...scriptedCards[0], status: "rejected", amount: "$0.00", reason: "Insufficient" };
    scriptedCards[1] = { ...scriptedCards[1], status: "checking" };
    setScanIndex(1);
    setSourceCards([...scriptedCards]);

    await wait(SCAN_TICK_MS);
    if (animationRunRef.current !== runId) return;

    scriptedCards[1] = { ...scriptedCards[1], status: "rejected", amount: "$0.00", reason: "Reserve held back" };
    scriptedCards[2] = { ...scriptedCards[2], status: "checking", apy: "4.20%" };
    setScanIndex(2);
    setSourceCards([...scriptedCards]);

    await wait(SCAN_TICK_MS);
    if (animationRunRef.current !== runId) return;

    scriptedCards[2] = { ...scriptedCards[2], status: "selected", amount: "route ready", apy: "4.20%", reason: null };
    scriptedCards[3] = { ...scriptedCards[3], status: "rejected", amount: "standby", apy: "0.35%", reason: "Lower priority" };
    setSourceCards([...scriptedCards]);
    setStatusMessage("Aave selected");

    await wait(SCAN_HOLD_MS);
    if (animationRunRef.current !== runId) return;

    setScanIndex(-1);
    setUiPhase("reasoning");
    setStatusMessage("Reserve route locked");

    await wait(REASONING_HOLD_MS);
    if (animationRunRef.current !== runId) return;

    setUiPhase("actions");

    const provisionalSteps = buildWorkflowSteps({ fundingSource: "aave_withdraw" });
    setTimelineSteps(provisionalSteps.map((step, index) => ({ ...step, status: index === 0 ? "active" : "pending" })));
    setStatusMessage(provisionalSteps[0]?.label ?? "Preparing payment");
  }, []);

  const setTimelineStepState = useCallback((index: number, step: Partial<TimelineStep>) => {
    setTimelineSteps(prev => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...step } : item)));
  }, []);

  const playWorkflowSequence = useCallback(
    async (
      runId: number,
      prep: JitPreparationResult,
      prepared: Parameters<typeof broadcastSignedChipTransaction>[0]["prepared"],
      signed: Parameters<typeof broadcastSignedChipTransaction>[0]["signed"],
    ) => {
      const resolvedSteps = buildWorkflowSteps(prep);

      setTimelineSteps(resolvedSteps.map((step, index) => ({ ...step, status: index === 0 ? "active" : "pending" })));
      setStatusMessage(resolvedSteps[0]?.label ?? "Preparing payment");

      for (let index = 0; index < Math.max(0, resolvedSteps.length - 1); index++) {
        await wait(ACTION_STEP_MS);
        if (animationRunRef.current !== runId) return;

        setTimelineStepState(index, { status: "complete" });

        const nextStep = resolvedSteps[index + 1];
        if (nextStep) {
          setTimelineStepState(index + 1, { status: "active" });
          setStatusMessage(nextStep.label);
        }
      }

      if (animationRunRef.current !== runId) return;

      setFlowState("submitting");

      const result = await broadcastSignedChipTransaction({
        publicClient,
        chipAddress: chipAddress as Address,
        prepared,
        signed,
      });

      if (animationRunRef.current !== runId) return;

      setFlowState("confirming");
      setStatusMessage("Confirming payment");
      setTxHash(result.txHash);

      const lastIndex = resolvedSteps.length - 1;
      setTimelineStepState(lastIndex, {
        status: "active",
        txHash: result.txHash,
        detail: "Transaction accepted on Base Sepolia.",
      });

      dispatchClientRefreshEvents({ balances: true, paymentRequests: true });

      setFlowState("success");
      setUiPhase("success");
      setStatusMessage("Sent");
      setTimelineStepState(lastIndex, {
        status: "complete",
        txHash: result.txHash,
        detail: "Payment confirmed and balances refreshed.",
      });

      onSuccess?.(result.txHash);
    },
    [chipAddress, onSuccess, publicClient, setTimelineStepState],
  );

  useEffect(() => {
    return () => {
      animationRunRef.current += 1;
    };
  }, []);

  const handleSettle = useCallback(async () => {
    setError("");
    setJitReasoning("");
    setJitReasoningSource(null);
    setJitFundingSource(null);
    setJitPreparation(null);
    setTxHash(null);
    setTimelineSteps([]);
    setUiPhase("idle");

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
      const runId = animationRunRef.current + 1;
      animationRunRef.current = runId;

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
      setStatusMessage("Scanning resources");
      const scanSequence = startScanAnimation(runId);

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

      if (funding) {
        setSourceCards(prev =>
          resolveSourceCards(
            prev.map(card => ({ ...card, status: card.status === "queued" ? "rejected" : card.status })),
            funding,
            {
              chipBalance: prepareData?.fundedWalletBalanceUsd ?? null,
              agentLiquid: null,
              aaveReserve: null,
              aaveApy: "4.20%",
              morphoApy: "0.35%",
            },
          ),
        );
      }

      await scanSequence;
      if (animationRunRef.current !== runId) return;

      await playWorkflowSequence(runId, prepareData ?? {}, prepared, signed);
    } catch (err) {
      console.error("Settlement error:", err);
      setFlowState("error");
      setUiPhase("actions");
      setError(parseContractError(err) || "Settlement failed. Please try again.");
      setStatusMessage("");
      setTimelineSteps(prev => {
        if (prev.length === 0) return prev;
        const activeIndex = prev.findIndex(step => step.status === "active");
        const fallbackIndex = activeIndex === -1 ? prev.length - 1 : activeIndex;
        return prev.map((step, index) =>
          index === fallbackIndex ? { ...step, status: "error", detail: "Agent flow stopped before settlement completed." } : step,
        );
      });
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
    playWorkflowSequence,
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
    setUiPhase("idle");
    setTimelineSteps([]);
    setSourceCards(buildInitialSourceCards());
    setScanIndex(-1);
    animationRunRef.current += 1;
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

  return {
    flowState,
    isProcessing,
    uiPhase,
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

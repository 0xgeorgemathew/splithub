/**
 * Settlement flow hook for single-payer NFC payments
 */
import { useCallback, useMemo, useState } from "react";
import { type JitFundingSource } from "../jitUiCopy";
import { FlowState, PaymentParams } from "../types";
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

interface UseSettleFlowReturn {
  flowState: FlowState;
  isProcessing: boolean;
  statusMessage: string;
  jitReasoning: string;
  jitReasoningSource: "llm" | "fallback" | null;
  jitFundingSource: JitFundingSource | null;
  error: string;
  txHash: string | null;
  symbol: string | undefined;
  decimals: number | undefined;
  isConnected: boolean;
  canInitiate: boolean;
  initiateSettle: () => Promise<void>;
  reset: () => void;
  getCurrentStepIndex: () => number;
}

export function useSettleFlow({ params, onSuccess, onError }: UseSettleFlowOptions): UseSettleFlowReturn {
  const { walletAddress, isConnected } = useWalletAddress();
  const { chipAddress } = useCurrentUser();
  const { signDigest } = useHaloChip();

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [jitReasoning, setJitReasoning] = useState("");
  const [jitReasoningSource, setJitReasoningSource] = useState<"llm" | "fallback" | null>(null);
  const [jitFundingSource, setJitFundingSource] = useState<JitFundingSource | null>(null);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

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

  const handleSettle = useCallback(async () => {
    setError("");
    setJitReasoning("");
    setJitReasoningSource(null);
    setJitFundingSource(null);
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
      setStatusMessage("AI checks route");

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

      const prepareData = (await prepareRes.json().catch(() => null)) as {
        shortfallUsd?: string;
        fundingSource?: "chip_balance" | "agent_liquid" | "aave_withdraw" | "insufficient_backing";
        reasoning?: string;
        reasoningSource?: "llm" | "fallback";
        withdrewFromAave?: boolean;
        transferredToFundedWallet?: boolean;
        error?: string;
      } | null;

      if (!prepareRes.ok) {
        throw new Error(prepareData?.error || "Failed to prepare chip wallet");
      }

      setJitReasoning(prepareData?.reasoning || "");
      setJitReasoningSource(prepareData?.reasoningSource || null);
      setJitFundingSource(prepareData?.fundingSource || null);

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
      onError?.(err instanceof Error ? err : new Error("Settlement failed"));
    }
  }, [chipAddress, decimals, isConnected, onError, onSuccess, params, publicClient, signDigest, walletAddress]);

  const reset = useCallback(() => {
    setFlowState("idle");
    setError("");
    setStatusMessage("");
    setJitReasoning("");
    setJitReasoningSource(null);
    setJitFundingSource(null);
    setTxHash(null);
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
    statusMessage,
    jitReasoning,
    jitReasoningSource,
    jitFundingSource,
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

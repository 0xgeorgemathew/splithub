/**
 * Settlement flow hook for single-payer NFC payments.
 *
 * The payer is the signed-in user paying from their own phone, so a single tap signs the
 * PaymentAuth and their wallet submits it.
 */
import { useCallback, useState } from "react";
import { FlowState, PaymentParams } from "../types";
import { type Address, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { useCurrentUser } from "~~/hooks/useCurrentUser";
import { type TapPaymentStep, useTapPayment } from "~~/hooks/useTapPayment";
import { useWalletAddress } from "~~/hooks/useWalletAddress";
import { dispatchClientRefreshEvents } from "~~/lib/clientTransactionUtils";
import { ERC20_ABI } from "~~/lib/contractAbis";
import { parseContractError } from "~~/utils/contractErrors";

interface UseSettleFlowOptions {
  params: PaymentParams;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

const STEP_STATE: Record<TapPaymentStep, FlowState> = {
  identifying: "tapping",
  tapping: "tapping",
  submitting: "submitting",
  confirming: "confirming",
};

const STEP_MESSAGE: Record<TapPaymentStep, string> = {
  identifying: "Tap chip",
  tapping: "Tap chip",
  submitting: "Sending",
  confirming: "Confirming",
};

export function useSettleFlow({ params, onSuccess, onError }: UseSettleFlowOptions) {
  const { walletAddress, isConnected } = useWalletAddress();
  const { chipAddress } = useCurrentUser();
  const { pay } = useTapPayment();

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

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

  const initiateSettle = useCallback(async () => {
    setError("");
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
      const amount = parseUnits(params.amount, decimals);
      const result = await pay(
        { payer: walletAddress as Address, recipient: params.recipient, token: params.token, amount },
        step => {
          setFlowState(STEP_STATE[step]);
          setStatusMessage(STEP_MESSAGE[step]);
        },
      );

      setTxHash(result.txHash);
      dispatchClientRefreshEvents({ balances: true, paymentRequests: true });

      setFlowState("success");
      setStatusMessage("Sent");
      onSuccess?.(result.txHash);
    } catch (err) {
      console.error("Settlement error:", err);
      setFlowState("error");
      setStatusMessage("");
      setError(parseContractError(err) || "Settlement failed. Please try again.");
      onError?.(err instanceof Error ? err : new Error("Settlement failed"));
    }
  }, [chipAddress, decimals, isConnected, onError, onSuccess, params, pay, walletAddress]);

  const reset = useCallback(() => {
    setFlowState("idle");
    setError("");
    setStatusMessage("");
    setTxHash(null);
  }, []);

  const isProcessing = flowState !== "idle" && flowState !== "success" && flowState !== "error";

  return {
    flowState,
    isProcessing,
    statusMessage,
    error,
    txHash,
    symbol,
    decimals,
    isConnected,
    canInitiate: !!chipAddress,
    initiateSettle,
    reset,
  };
}

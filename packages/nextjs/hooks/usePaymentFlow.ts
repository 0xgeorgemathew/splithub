"use client";

import { useCallback, useState } from "react";
import { parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { PAYMENT_DEADLINE } from "~~/config/tokens";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

/**
 * Payment flow states
 */
export type FlowState = "idle" | "tapping" | "signing" | "submitting" | "confirming" | "success" | "error";

/**
 * Payment status for UI display
 */
export type PaymentStatus = "idle" | "processing" | "success";

/**
 * Payment parameters
 */
export interface PaymentFlowParams {
  payer: `0x${string}`;
  recipient: `0x${string}`;
  token: `0x${string}`;
  amount: string;
  decimals: number;
}

const SPLIT_HUB_PAYMENTS_ABI = [
  {
    name: "nonces",
    type: "function",
    inputs: [{ name: "payer", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/**
 * Hook to manage the payment flow state machine
 *
 * Encapsulates EIP-712 signing, relay submission, and state transitions.
 *
 * @param payer - Payer wallet address (optional, can be set later)
 */
export function usePaymentFlow(payer?: `0x${string}`) {
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get contract address
  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;
  const paymentsAddress = chainContracts?.SplitHubPayments?.address as `0x${string}` | undefined;

  // Read current nonce for payer
  const { data: currentNonce, refetch: refetchNonce } = useReadContract({
    address: paymentsAddress,
    abi: SPLIT_HUB_PAYMENTS_ABI,
    functionName: "nonces",
    args: payer ? [payer] : undefined,
    query: {
      enabled: !!payer && !!paymentsAddress,
    },
  });

  /**
   * Execute a payment through the NFC chip and relay
   */
  const executePayment = useCallback(
    async (params: PaymentFlowParams) => {
      setError("");
      setTxHash(null);

      if (!paymentsAddress) {
        setError("SplitHubPayments contract not deployed on this network");
        setFlowState("error");
        return null;
      }

      if (currentNonce === undefined) {
        setError("Could not read nonce from contract");
        setFlowState("error");
        return null;
      }

      try {
        setFlowState("tapping");

        // Build PaymentAuth struct
        const amountInWei = parseUnits(params.amount, params.decimals);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + PAYMENT_DEADLINE.SECONDS);

        const paymentAuth = {
          payer: params.payer,
          recipient: params.recipient,
          token: params.token,
          amount: amountInWei,
          nonce: currentNonce,
          deadline,
        };

        // EIP-712 domain and types
        const domain = {
          name: "SplitHubPayments",
          version: "1",
          chainId: BigInt(targetNetwork.id),
          verifyingContract: paymentsAddress,
        };

        const types = {
          PaymentAuth: [
            { name: "payer", type: "address" },
            { name: "recipient", type: "address" },
            { name: "token", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        };

        // Sign with NFC chip
        setFlowState("signing");
        const chipResult = await signTypedData({
          domain,
          types,
          primaryType: "PaymentAuth",
          message: paymentAuth,
        });

        // Submit to relay
        setFlowState("submitting");
        const response = await fetch("/api/relay/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auth: {
              payer: paymentAuth.payer,
              recipient: paymentAuth.recipient,
              token: paymentAuth.token,
              amount: paymentAuth.amount.toString(),
              nonce: paymentAuth.nonce.toString(),
              deadline: paymentAuth.deadline.toString(),
            },
            signature: chipResult.signature,
            contractAddress: paymentsAddress,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Relay request failed");
        }

        // Confirming state
        setFlowState("confirming");
        setTxHash(result.txHash);

        // Brief delay for UX
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Refetch nonce for next payment
        await refetchNonce();

        // Trigger balance refresh
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("refreshBalances"));
        }

        setFlowState("success");
        return result.txHash;
      } catch (err: unknown) {
        console.error("Payment error:", err);
        setFlowState("error");
        setError(err instanceof Error ? err.message : "Payment failed");
        return null;
      }
    },
    [paymentsAddress, currentNonce, targetNetwork.id, signTypedData, refetchNonce],
  );

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    setFlowState("idle");
    setError("");
    setTxHash(null);
  }, []);

  /**
   * Get PaymentStatus for UI indicator
   */
  const getPaymentStatus = (): PaymentStatus => {
    if (flowState === "success") return "success";
    if (["tapping", "signing", "submitting", "confirming"].includes(flowState)) return "processing";
    return "idle";
  };

  /**
   * Get processing text for current state
   */
  const getProcessingText = (): string => {
    switch (flowState) {
      case "tapping":
        return "Tap your chip...";
      case "signing":
        return "Authorizing...";
      case "submitting":
        return "Broadcasting...";
      case "confirming":
        return "Confirming...";
      default:
        return "Processing...";
    }
  };

  return {
    flowState,
    error,
    txHash,
    paymentsAddress,
    executePayment,
    reset,
    paymentStatus: getPaymentStatus(),
    processingText: getProcessingText(),
  };
}

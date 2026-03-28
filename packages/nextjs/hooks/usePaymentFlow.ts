"use client";

import { useCallback, useState } from "react";
import { parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { PAYMENT_DEADLINE } from "~~/config/tokens";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useEmbeddedWalletClient } from "~~/hooks/useEmbeddedWalletClient";
import { baseSepolia, createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { dispatchClientRefreshEvents, triggerCircleAutoSplit } from "~~/lib/clientTransactionUtils";
import { SPLIT_HUB_PAYMENTS_ABI } from "~~/lib/contractAbis";
import { parseContractError } from "~~/utils/contractErrors";

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

/**
 * Hook to manage the payment flow state machine
 *
 * Encapsulates EIP-712 signing, direct submission, and state transitions.
 *
 * @param payer - Payer wallet address (optional, can be set later)
 */
export function usePaymentFlow(payer?: `0x${string}`) {
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();
  const { getWalletClient } = useEmbeddedWalletClient();

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
   * Execute a payment through the NFC chip and a direct wallet submission
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

        // Submit directly from the connected wallet
        setFlowState("submitting");
        const walletClient = await getWalletClient();
        const hash = await walletClient.writeContract({
          account: walletClient.account!,
          address: paymentsAddress,
          abi: SPLIT_HUB_PAYMENTS_ABI,
          chain: baseSepolia,
          functionName: "executePayment",
          args: [paymentAuth, chipResult.signature as `0x${string}`],
        });

        // Confirming state
        setFlowState("confirming");
        setTxHash(hash);

        const publicClient = createBaseSepoliaPublicClient();
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error("Payment failed on-chain");
        }

        await triggerCircleAutoSplit({
          userWallet: params.payer,
          amount: amountInWei.toString(),
          tokenAddress: params.token,
          decimals: params.decimals,
        });

        // Refetch nonce for next payment
        await refetchNonce();

        // Trigger balance refresh
        dispatchClientRefreshEvents({ balances: true, paymentRequests: true });

        setFlowState("success");
        return hash;
      } catch (err: unknown) {
        console.error("Payment error:", err);
        setFlowState("error");
        setError(parseContractError(err) || "Payment failed");
        return null;
      }
    },
    [paymentsAddress, currentNonce, targetNetwork.id, signTypedData, getWalletClient, refetchNonce],
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

import { useCallback, useState } from "react";
import { ERC20_ABI, FlowState, PaymentParams, SPLIT_HUB_PAYMENTS_ABI } from "../types";
import { parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

interface UseSettleFlowOptions {
  params: PaymentParams;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

interface UseSettleFlowReturn {
  flowState: FlowState;
  statusMessage: string;
  error: string;
  txHash: string | null;
  symbol: string | undefined;
  decimals: number | undefined;
  isConnected: boolean;
  paymentsAddress: `0x${string}` | undefined;
  handleSettle: () => Promise<void>;
  reset: () => void;
  getCurrentStepIndex: () => number;
}

export function useSettleFlow({ params, onSuccess, onError }: UseSettleFlowOptions): UseSettleFlowReturn {
  const { address, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get SplitHubPayments contract address for the current network
  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;
  const paymentsAddress = chainContracts?.SplitHubPayments?.address as `0x${string}` | undefined;

  // Read token decimals
  const { data: decimals } = useReadContract({
    address: params.token,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  // Read token symbol
  const { data: symbol } = useReadContract({
    address: params.token,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  // Read current nonce for payer
  const { data: currentNonce, refetch: refetchNonce } = useReadContract({
    address: paymentsAddress,
    abi: SPLIT_HUB_PAYMENTS_ABI,
    functionName: "nonces",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!paymentsAddress,
    },
  });

  const handleSettle = useCallback(async () => {
    setError("");
    setTxHash(null);

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!paymentsAddress) {
      setError("SplitHubPayments contract not deployed on this network");
      return;
    }

    if (decimals === undefined) {
      setError("Could not read token decimals. Is this a valid ERC-20 token?");
      return;
    }

    if (currentNonce === undefined) {
      setError("Could not read nonce from contract");
      return;
    }

    try {
      setFlowState("tapping");
      setStatusMessage("Tap your chip");

      // Build PaymentAuth struct
      const amountInWei = parseUnits(params.amount, decimals);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

      const paymentAuth = {
        payer: address,
        recipient: params.recipient,
        token: params.token,
        amount: amountInWei,
        nonce: currentNonce,
        deadline: deadline,
      };

      // EIP-712 domain and types matching SplitHubPayments.sol
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

      // Signing state
      setFlowState("signing");
      setStatusMessage("Signing...");

      // Sign with NFC chip
      const chipResult = await signTypedData({
        domain,
        types,
        primaryType: "PaymentAuth",
        message: paymentAuth,
      });

      // Submitting state
      setFlowState("submitting");
      setStatusMessage("Sending...");

      // Submit to relay API
      const response = await fetch("/api/relay/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      setStatusMessage("Confirming...");
      setTxHash(result.txHash);

      // Brief delay to show confirming state
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refetch nonce for next payment
      await refetchNonce();

      setFlowState("success");
      setStatusMessage("Complete!");

      // Call success callback
      if (onSuccess) {
        onSuccess(result.txHash);
      }
    } catch (err: any) {
      console.error("Settlement error:", err);
      setFlowState("error");
      setError(err.message || "Settlement failed. Please try again.");
      setStatusMessage("");

      // Call error callback
      if (onError) {
        onError(err);
      }
    }
  }, [
    address,
    isConnected,
    paymentsAddress,
    decimals,
    currentNonce,
    params,
    targetNetwork.id,
    signTypedData,
    refetchNonce,
    onSuccess,
    onError,
  ]);

  const reset = useCallback(() => {
    setFlowState("idle");
    setError("");
    setStatusMessage("");
    setTxHash(null);
  }, []);

  const getCurrentStepIndex = useCallback(() => {
    const stepMap: Record<string, number> = {
      tapping: 0,
      signing: 1,
      submitting: 2,
      confirming: 3,
    };
    return stepMap[flowState] ?? -1;
  }, [flowState]);

  return {
    flowState,
    statusMessage,
    error,
    txHash,
    symbol,
    decimals,
    isConnected,
    paymentsAddress,
    handleSettle,
    reset,
    getCurrentStepIndex,
  };
}

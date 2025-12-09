import { useCallback, useMemo, useState } from "react";
import { ERC20_ABI, FlowState, PaymentParams, SPLIT_HUB_PAYMENTS_ABI } from "../types";
import { usePrivy } from "@privy-io/react-auth";
import { createPublicClient, http, parseUnits } from "viem";
import { useReadContract } from "wagmi";
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
  const { authenticated, user } = usePrivy();
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();

  const isConnected = authenticated && !!user?.wallet?.address;

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get contract addresses for the current network
  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;
  const paymentsAddress = chainContracts?.SplitHubPayments?.address as `0x${string}` | undefined;

  // Create public client for contract reads
  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: targetNetwork,
        transport: http(),
      }),
    [targetNetwork],
  );

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

  const handleSettle = useCallback(async () => {
    setError("");
    setTxHash(null);

    if (!isConnected || !user?.wallet?.address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!paymentsAddress) {
      setError("Contracts not deployed on this network");
      return;
    }

    if (decimals === undefined) {
      setError("Could not read token decimals. Is this a valid ERC-20 token?");
      return;
    }

    const payerAddress = user.wallet.address as `0x${string}`;

    try {
      // Fetch nonce for the connected wallet
      setFlowState("signing");
      setStatusMessage("Preparing...");

      const nonce = (await publicClient.readContract({
        address: paymentsAddress,
        abi: SPLIT_HUB_PAYMENTS_ABI,
        functionName: "nonces",
        args: [payerAddress],
      })) as bigint;

      const amountInWei = parseUnits(params.amount, decimals);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

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

      // Build PaymentAuth with connected wallet as payer
      const paymentAuth = {
        payer: payerAddress,
        recipient: params.recipient,
        token: params.token,
        amount: amountInWei,
        nonce,
        deadline,
      };

      // Single tap to sign
      setFlowState("tapping");
      setStatusMessage("Tap your chip");

      const chipResult = await signTypedData({
        domain,
        types,
        primaryType: "PaymentAuth",
        message: paymentAuth,
      });

      // Signing state
      setFlowState("signing");
      setStatusMessage("Signing...");

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
    isConnected,
    user?.wallet?.address,
    paymentsAddress,
    decimals,
    params,
    targetNetwork.id,
    publicClient,
    signTypedData,
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

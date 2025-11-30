import { useCallback, useMemo, useState } from "react";
import { ERC20_ABI, FlowState, PaymentParams, SPLIT_HUB_PAYMENTS_ABI, SPLIT_HUB_REGISTRY_ABI } from "../types";
import { createPublicClient, http, parseUnits } from "viem";
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
  const { isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get contract addresses for the current network
  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;
  const paymentsAddress = chainContracts?.SplitHubPayments?.address as `0x${string}` | undefined;
  const registryAddress = chainContracts?.SplitHubRegistry?.address as `0x${string}` | undefined;

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

    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    if (!paymentsAddress || !registryAddress) {
      setError("Contracts not deployed on this network");
      return;
    }

    if (decimals === undefined) {
      setError("Could not read token decimals. Is this a valid ERC-20 token?");
      return;
    }

    try {
      setFlowState("tapping");
      setStatusMessage("Tap your chip (1/2)");

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

      // FIRST TAP: Sign with placeholder payer to get chip address
      const placeholderAuth = {
        payer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        recipient: params.recipient,
        token: params.token,
        amount: amountInWei,
        nonce: BigInt(0),
        deadline,
      };

      const firstTapResult = await signTypedData({
        domain,
        types,
        primaryType: "PaymentAuth",
        message: placeholderAuth,
      });

      const chipAddress = firstTapResult.address as `0x${string}`;

      // Look up chip owner from registry
      setStatusMessage("Looking up chip owner...");
      const owner = (await publicClient.readContract({
        address: registryAddress,
        abi: SPLIT_HUB_REGISTRY_ABI,
        functionName: "ownerOf",
        args: [chipAddress],
      })) as `0x${string}`;

      if (!owner || owner === "0x0000000000000000000000000000000000000000") {
        throw new Error("Chip not registered. Please register your chip first.");
      }

      // Get the correct nonce for this payer
      const nonce = (await publicClient.readContract({
        address: paymentsAddress,
        abi: SPLIT_HUB_PAYMENTS_ABI,
        functionName: "nonces",
        args: [owner],
      })) as bigint;

      // SECOND TAP: Sign with correct payer
      setFlowState("tapping");
      setStatusMessage("Tap your chip again (2/2)");

      const realPaymentAuth = {
        payer: owner,
        recipient: params.recipient,
        token: params.token,
        amount: amountInWei,
        nonce,
        deadline,
      };

      // Signing state
      setFlowState("signing");
      setStatusMessage("Signing...");

      // Sign with NFC chip
      const chipResult = await signTypedData({
        domain,
        types,
        primaryType: "PaymentAuth",
        message: realPaymentAuth,
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
            payer: realPaymentAuth.payer,
            recipient: realPaymentAuth.recipient,
            token: realPaymentAuth.token,
            amount: realPaymentAuth.amount.toString(),
            nonce: realPaymentAuth.nonce.toString(),
            deadline: realPaymentAuth.deadline.toString(),
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
    paymentsAddress,
    registryAddress,
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

/**
 * Settlement flow hook for single-payer NFC payments
 *
 * Naming conventions:
 * - `initiateSettle` - Primary action trigger (follows "initiate*" pattern for action hooks)
 * - `isProcessing` - Boolean derived from flowState for convenience
 * - `reset` - Resets hook state to initial values
 * - `error` - Current error message (empty string when no error)
 */
import { useCallback, useMemo, useState } from "react";
import { FlowState, PaymentParams } from "../types";
import { parseUnits } from "viem";
import { useReadContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useEmbeddedWalletClient } from "~~/hooks/useEmbeddedWalletClient";
import { useWalletAddress } from "~~/hooks/useWalletAddress";
import { baseSepolia, createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { dispatchClientRefreshEvents, triggerCircleAutoSplit } from "~~/lib/clientTransactionUtils";
import { ERC20_ABI, SPLIT_HUB_PAYMENTS_ABI } from "~~/lib/contractAbis";
import { parseContractError } from "~~/utils/contractErrors";

interface UseSettleFlowOptions {
  params: PaymentParams;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

interface UseSettleFlowReturn {
  flowState: FlowState;
  /** Convenience boolean - true when flow is in progress */
  isProcessing: boolean;
  statusMessage: string;
  error: string;
  txHash: string | null;
  symbol: string | undefined;
  decimals: number | undefined;
  isConnected: boolean;
  paymentsAddress: `0x${string}` | undefined;
  /** Primary action - initiates the settlement flow */
  initiateSettle: () => Promise<void>;
  reset: () => void;
  getCurrentStepIndex: () => number;
}

export function useSettleFlow({ params, onSuccess, onError }: UseSettleFlowOptions): UseSettleFlowReturn {
  const { walletAddress, isConnected } = useWalletAddress();
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();
  const { getWalletClient } = useEmbeddedWalletClient();

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
  const publicClient = useMemo(() => createBaseSepoliaPublicClient(), []);

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

    if (!isConnected || !walletAddress) {
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

    const payerAddress = walletAddress;

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
      setStatusMessage("Confirming...");
      setTxHash(hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("Payment failed on-chain");
      }

      await triggerCircleAutoSplit({
        userWallet: payerAddress,
        amount: amountInWei.toString(),
        tokenAddress: params.token,
        decimals,
      });

      dispatchClientRefreshEvents({ balances: true, paymentRequests: true });

      setFlowState("success");
      setStatusMessage("Complete!");

      // Call success callback
      if (onSuccess) {
        onSuccess(hash);
      }
    } catch (err: any) {
      console.error("Settlement error:", err);
      setFlowState("error");
      setError(parseContractError(err) || "Settlement failed. Please try again.");
      setStatusMessage("");

      // Call error callback
      if (onError) {
        onError(err);
      }
    }
  }, [
    isConnected,
    walletAddress,
    paymentsAddress,
    decimals,
    params,
    targetNetwork.id,
    publicClient,
    signTypedData,
    getWalletClient,
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

  // Convenience boolean for checking if flow is in progress
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
    paymentsAddress,
    initiateSettle: handleSettle,
    reset,
    getCurrentStepIndex,
  };
}

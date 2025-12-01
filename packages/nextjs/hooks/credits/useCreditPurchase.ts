import { useCallback, useEffect, useRef, useState } from "react";
import { parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

// Flow states
export type CreditFlowState = "idle" | "tapping" | "signing" | "submitting" | "confirming" | "success" | "error";

// CreditToken ABI for nonces
const CREDIT_TOKEN_ABI = [
  {
    name: "nonces",
    type: "function",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

interface UseCreditPurchaseOptions {
  onSuccess?: (txHash: string, creditsMinted: string) => void;
  onError?: (error: Error) => void;
}

const TARGET_CONFIRMATIONS = 3;

export function useCreditPurchase({ onSuccess, onError }: UseCreditPurchaseOptions = {}) {
  const { address, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();
  const publicClient = usePublicClient();

  const [flowState, setFlowState] = useState<CreditFlowState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState(0);
  const [blockNumber, setBlockNumber] = useState<string | null>(null);
  const [creditsMinted, setCreditsMinted] = useState<string | null>(null);
  const [gasUsed, setGasUsed] = useState<string | null>(null);

  // Ref to track polling interval
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  // Poll for confirmations
  const pollConfirmations = useCallback(
    async (targetBlockNumber: bigint) => {
      if (!publicClient) return;

      const poll = async () => {
        try {
          const currentBlock = await publicClient.getBlockNumber();
          const confs = Math.min(Number(currentBlock - targetBlockNumber) + 1, TARGET_CONFIRMATIONS);
          setConfirmations(confs);

          if (confs < TARGET_CONFIRMATIONS) {
            pollingRef.current = setTimeout(poll, 2000);
          } else {
            setFlowState("success");
            setStatusMessage("Complete!");
          }
        } catch (err) {
          console.error("Polling error:", err);
          // Continue polling even on error
          pollingRef.current = setTimeout(poll, 2000);
        }
      };

      poll();
    },
    [publicClient],
  );

  // Get CreditToken contract address
  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;
  const creditTokenAddress = chainContracts?.CreditToken?.address as `0x${string}` | undefined;

  // Read current nonce for user
  const { data: currentNonce, refetch: refetchNonce } = useReadContract({
    address: creditTokenAddress,
    abi: CREDIT_TOKEN_ABI,
    functionName: "nonces",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!creditTokenAddress,
    },
  });

  const purchaseCredits = useCallback(
    async (usdcAmount: string) => {
      setError("");
      setTxHash(null);

      if (!isConnected || !address) {
        setError("Please connect your wallet first");
        return;
      }

      if (!creditTokenAddress) {
        setError("CreditToken contract not deployed on this network");
        return;
      }

      if (currentNonce === undefined) {
        setError("Could not read nonce from contract");
        return;
      }

      try {
        setFlowState("tapping");
        setStatusMessage("Tap your chip");

        // Build CreditPurchase struct
        // USDC has 6 decimals
        const amountInWei = parseUnits(usdcAmount, 6);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

        const creditPurchase = {
          buyer: address,
          usdcAmount: amountInWei,
          nonce: currentNonce,
          deadline: deadline,
        };

        // EIP-712 domain and types matching CreditToken.sol
        const domain = {
          name: "CreditToken",
          version: "1",
          chainId: BigInt(targetNetwork.id),
          verifyingContract: creditTokenAddress,
        };

        const types = {
          CreditPurchase: [
            { name: "buyer", type: "address" },
            { name: "usdcAmount", type: "uint256" },
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
          primaryType: "CreditPurchase",
          message: creditPurchase,
        });

        // Submitting state
        setFlowState("submitting");
        setStatusMessage("Sending...");

        // Submit to relay API
        const response = await fetch("/api/relay/credit-purchase", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            purchase: {
              buyer: creditPurchase.buyer,
              usdcAmount: creditPurchase.usdcAmount.toString(),
              nonce: creditPurchase.nonce.toString(),
              deadline: creditPurchase.deadline.toString(),
            },
            signature: chipResult.signature,
            contractAddress: creditTokenAddress,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Relay request failed");
        }

        // Set transaction data
        setTxHash(result.txHash);
        setBlockNumber(result.blockNumber);
        setCreditsMinted(result.creditsMinted);
        setGasUsed(result.gasUsed);

        // Confirming state - start polling for confirmations
        setFlowState("confirming");
        setStatusMessage("Confirming...");
        setConfirmations(1); // Start at 1 since we already have first confirmation

        // Start polling for additional confirmations
        pollConfirmations(BigInt(result.blockNumber));

        // Refetch nonce for next purchase
        await refetchNonce();

        // Call success callback
        if (onSuccess) {
          onSuccess(result.txHash, result.creditsMinted);
        }
      } catch (err: unknown) {
        console.error("Credit purchase error:", err);
        setFlowState("error");
        const errorMessage = err instanceof Error ? err.message : "Purchase failed. Please try again.";
        setError(errorMessage);
        setStatusMessage("");

        // Call error callback
        if (onError && err instanceof Error) {
          onError(err);
        }
      }
    },
    [
      address,
      isConnected,
      creditTokenAddress,
      currentNonce,
      targetNetwork.id,
      signTypedData,
      refetchNonce,
      pollConfirmations,
      onSuccess,
      onError,
    ],
  );

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    setFlowState("idle");
    setError("");
    setStatusMessage("");
    setTxHash(null);
    setConfirmations(0);
    setBlockNumber(null);
    setCreditsMinted(null);
    setGasUsed(null);
  }, []);

  return {
    flowState,
    statusMessage,
    error,
    txHash,
    confirmations,
    targetConfirmations: TARGET_CONFIRMATIONS,
    blockNumber,
    creditsMinted,
    gasUsed,
    networkName: targetNetwork.name,
    isConnected,
    creditTokenAddress,
    purchaseCredits,
    reset,
  };
}

import { useCallback, useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
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

interface UseCreditSpendOptions {
  onSuccess?: (txHash: string, activityId: number) => void;
  onError?: (error: Error) => void;
}

export function useCreditSpend({ onSuccess, onError }: UseCreditSpendOptions = {}) {
  const { address, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();

  const [flowState, setFlowState] = useState<CreditFlowState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

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

  const spendCredits = useCallback(
    async (creditAmount: number, activityId: number) => {
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

        // Build CreditSpend struct
        // Credits have 18 decimals
        const amountInWei = parseUnits(creditAmount.toString(), 18);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

        const creditSpend = {
          spender: address,
          amount: amountInWei,
          activityId: BigInt(activityId),
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
          CreditSpend: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "activityId", type: "uint256" },
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
          primaryType: "CreditSpend",
          message: creditSpend,
        });

        // Submitting state
        setFlowState("submitting");
        setStatusMessage("Sending...");

        // Submit to relay API
        const response = await fetch("/api/relay/credit-spend", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            spend: {
              spender: creditSpend.spender,
              amount: creditSpend.amount.toString(),
              activityId: creditSpend.activityId.toString(),
              nonce: creditSpend.nonce.toString(),
              deadline: creditSpend.deadline.toString(),
            },
            signature: chipResult.signature,
            contractAddress: creditTokenAddress,
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

        // Refetch nonce for next spend
        await refetchNonce();

        setFlowState("success");
        setStatusMessage("Complete!");

        // Call success callback
        if (onSuccess) {
          onSuccess(result.txHash, activityId);
        }
      } catch (err: unknown) {
        console.error("Credit spend error:", err);
        setFlowState("error");
        const errorMessage = err instanceof Error ? err.message : "Spend failed. Please try again.";
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
      onSuccess,
      onError,
    ],
  );

  const reset = useCallback(() => {
    setFlowState("idle");
    setError("");
    setStatusMessage("");
    setTxHash(null);
  }, []);

  return {
    flowState,
    statusMessage,
    error,
    txHash,
    isConnected,
    creditTokenAddress,
    spendCredits,
    reset,
  };
}

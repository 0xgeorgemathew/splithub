import { useCallback, useMemo, useState } from "react";
import { createPublicClient, http, parseUnits } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

// Flow states
export type CreditFlowState = "idle" | "tapping" | "signing" | "submitting" | "confirming" | "success" | "error";

// Registry ABI for owner lookup
const SPLIT_HUB_REGISTRY_ABI = [
  {
    name: "ownerOf",
    type: "function",
    inputs: [{ name: "signer", type: "address" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;

// CreditToken ABI for nonces and balance
const CREDIT_TOKEN_ABI = [
  {
    name: "nonces",
    type: "function",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

interface UseCreditSpendOptions {
  onSuccess?: (txHash: string, activityId: number, ownerAddress: string) => void;
  onError?: (error: Error) => void;
}

export function useCreditSpend({ onSuccess, onError }: UseCreditSpendOptions = {}) {
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();

  const [flowState, setFlowState] = useState<CreditFlowState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [remainingBalance, setRemainingBalance] = useState<string | null>(null);

  // Create public client for contract reads
  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: targetNetwork,
        transport: http(),
      }),
    [targetNetwork],
  );

  // Get contract addresses
  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;
  const creditTokenAddress = chainContracts?.CreditToken?.address as `0x${string}` | undefined;
  const registryAddress = chainContracts?.SplitHubRegistry?.address as `0x${string}` | undefined;

  const spendCredits = useCallback(
    async (creditAmount: number, activityId: number) => {
      setError("");
      setTxHash(null);
      setOwnerAddress(null);
      setRemainingBalance(null);

      if (!creditTokenAddress || !registryAddress) {
        setError("Contracts not deployed on this network");
        return;
      }

      try {
        setFlowState("tapping");
        setStatusMessage("Tap your chip");

        // Credits have 18 decimals
        const amountInWei = parseUnits(creditAmount.toString(), 18);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

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

        // Signing state - first tap to get chip address
        setFlowState("signing");
        setStatusMessage("Signing...");

        // First sign to get chip address
        const chipResult = await signTypedData({
          domain,
          types,
          primaryType: "CreditSpend",
          message: {
            spender: "0x0000000000000000000000000000000000000000" as `0x${string}`,
            amount: amountInWei,
            activityId: BigInt(activityId),
            nonce: BigInt(0),
            deadline: deadline,
          },
        });

        const chipAddress = chipResult.address as `0x${string}`;

        // Lookup owner from registry
        const owner = (await publicClient.readContract({
          address: registryAddress,
          abi: SPLIT_HUB_REGISTRY_ABI,
          functionName: "ownerOf",
          args: [chipAddress],
        })) as `0x${string}`;

        if (!owner || owner === "0x0000000000000000000000000000000000000000") {
          throw new Error("Chip not registered. Please register your chip first.");
        }

        setOwnerAddress(owner);

        // Get the nonce for this owner
        const nonce = (await publicClient.readContract({
          address: creditTokenAddress,
          abi: CREDIT_TOKEN_ABI,
          functionName: "nonces",
          args: [owner],
        })) as bigint;

        // Build the real CreditSpend struct with correct spender and nonce
        const creditSpend = {
          spender: owner,
          amount: amountInWei,
          activityId: BigInt(activityId),
          nonce: nonce,
          deadline: deadline,
        };

        // Sign the real message with correct values
        const finalChipResult = await signTypedData({
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
            signature: finalChipResult.signature,
            contractAddress: creditTokenAddress,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Relay request failed");
        }

        // Set transaction data
        setTxHash(result.txHash);

        // Wait for transaction confirmation
        setFlowState("confirming");
        setStatusMessage("Confirming...");
        await publicClient.waitForTransactionReceipt({ hash: result.txHash as `0x${string}` });

        // Create a fresh client with cache disabled to get accurate post-tx balance
        const freshClient = createPublicClient({
          chain: targetNetwork,
          transport: http(undefined, {
            fetchOptions: { cache: "no-store" },
          }),
        });

        // Fetch remaining balance AFTER confirmation
        const balance = (await freshClient.readContract({
          address: creditTokenAddress,
          abi: CREDIT_TOKEN_ABI,
          functionName: "balanceOf",
          args: [owner],
        })) as bigint;

        setRemainingBalance(balance.toString());

        // Now transition to success
        setFlowState("success");
        setStatusMessage("Complete!");

        // Call success callback
        if (onSuccess) {
          onSuccess(result.txHash, activityId, owner);
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
    [creditTokenAddress, registryAddress, targetNetwork.id, signTypedData, publicClient, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setFlowState("idle");
    setError("");
    setStatusMessage("");
    setTxHash(null);
    setOwnerAddress(null);
    setRemainingBalance(null);
  }, []);

  return {
    flowState,
    statusMessage,
    error,
    txHash,
    ownerAddress,
    remainingBalance,
    networkName: targetNetwork.name,
    creditTokenAddress,
    spendCredits,
    reset,
  };
}

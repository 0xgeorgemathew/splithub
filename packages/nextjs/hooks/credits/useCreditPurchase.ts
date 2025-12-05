import { useCallback, useMemo, useState } from "react";
import { createPublicClient, http, parseUnits } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

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

// Flow states
export type CreditFlowState = "idle" | "tapping" | "signing" | "submitting" | "confirming" | "success" | "error";

interface UseCreditPurchaseOptions {
  onSuccess?: (txHash: string, creditsMinted: string, ownerAddress: string) => void;
  onError?: (error: Error) => void;
}

export function useCreditPurchase({ onSuccess, onError }: UseCreditPurchaseOptions = {}) {
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();

  const [flowState, setFlowState] = useState<CreditFlowState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [creditsMinted, setCreditsMinted] = useState<string | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<string | null>(null);

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

  const purchaseCredits = useCallback(
    async (usdcAmount: string) => {
      setError("");
      setTxHash(null);
      setCreditsMinted(null);
      setOwnerAddress(null);
      setNewBalance(null);

      if (!creditTokenAddress || !registryAddress) {
        setError("Contracts not deployed on this network");
        return;
      }

      try {
        setFlowState("tapping");
        setStatusMessage("Tap your chip");

        // USDC has 6 decimals
        const amountInWei = parseUnits(usdcAmount, 6);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

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

        // Signing state - first tap to get chip address
        setFlowState("signing");
        setStatusMessage("Signing...");

        // We need to do a preliminary sign to get the chip address first
        // Then lookup owner and nonce, then sign the actual message
        const chipResult = await signTypedData({
          domain,
          types,
          primaryType: "CreditPurchase",
          // Placeholder message - we'll use the chip address to get real values
          message: {
            buyer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
            usdcAmount: amountInWei,
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

        // Build the real CreditPurchase struct with correct buyer and nonce
        const creditPurchase = {
          buyer: owner,
          usdcAmount: amountInWei,
          nonce: nonce,
          deadline: deadline,
        };

        // Sign the real message with correct values
        const finalChipResult = await signTypedData({
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
        setCreditsMinted(result.creditsMinted);

        // Wait for transaction confirmation
        setFlowState("confirming");
        setStatusMessage("Confirming...");
        const receipt = await publicClient.waitForTransactionReceipt({ hash: result.txHash as `0x${string}` });

        // Create a fresh client with cache disabled to get accurate post-tx balance
        const freshClient = createPublicClient({
          chain: targetNetwork,
          transport: http(undefined, {
            fetchOptions: { cache: "no-store" },
          }),
        });

        // Fetch new balance AFTER confirmation at the confirmed block
        const balance = (await freshClient.readContract({
          address: creditTokenAddress,
          abi: [
            {
              name: "balanceOf",
              type: "function",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ type: "uint256" }],
              stateMutability: "view",
            },
          ] as const,
          functionName: "balanceOf",
          args: [owner],
          blockNumber: receipt.blockNumber,
        })) as bigint;

        setNewBalance(balance.toString());

        // Now transition to success
        setFlowState("success");
        setStatusMessage("Complete!");

        // Call success callback
        if (onSuccess) {
          onSuccess(result.txHash, result.creditsMinted, owner);
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
    [creditTokenAddress, registryAddress, targetNetwork.id, signTypedData, publicClient, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setFlowState("idle");
    setError("");
    setStatusMessage("");
    setTxHash(null);
    setCreditsMinted(null);
    setOwnerAddress(null);
    setNewBalance(null);
  }, []);

  return {
    flowState,
    statusMessage,
    error,
    txHash,
    creditsMinted,
    ownerAddress,
    newBalance,
    networkName: targetNetwork.name,
    creditTokenAddress,
    purchaseCredits,
    reset,
  };
}

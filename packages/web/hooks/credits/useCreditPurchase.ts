import { useCallback, useMemo, useState } from "react";
import { parseUnits } from "viem";
import { TOKENS } from "~~/config/tokens";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useEmbeddedWalletClient } from "~~/hooks/useEmbeddedWalletClient";
import { baseSepolia, createBaseSepoliaPublicClient, createFreshBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { dispatchClientRefreshEvents, triggerCircleAutoSplit } from "~~/lib/clientTransactionUtils";
import { CREDIT_TOKEN_ABI, SPLIT_HUB_REGISTRY_ABI } from "~~/lib/contractAbis";
import { parseContractError } from "~~/utils/contractErrors";
import { calculateCreditsMinted } from "~~/utils/creditCalculations";

export type CreditFlowState =
  | "idle"
  | "tapping"
  | "signing"
  | "preparing"
  | "confirming_signature"
  | "submitting"
  | "confirming"
  | "success"
  | "error";

interface UseCreditPurchaseOptions {
  onSuccess?: (txHash: string, creditsMinted: string, ownerAddress: string) => void;
  onError?: (error: Error) => void;
}

export function useCreditPurchase({ onSuccess, onError }: UseCreditPurchaseOptions = {}) {
  const { targetNetwork } = useTargetNetwork();
  const { getChipAddress, signTypedData } = useHaloChip();
  const { getWalletClient } = useEmbeddedWalletClient();

  const [flowState, setFlowState] = useState<CreditFlowState>("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [creditsMinted, setCreditsMinted] = useState<string | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<string | null>(null);

  const publicClient = useMemo(() => createBaseSepoliaPublicClient(), []);

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

        const amountInWei = parseUnits(usdcAmount, 6);
        const minted = calculateCreditsMinted(amountInWei).toString();
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

        setFlowState("preparing");
        const chip = await getChipAddress();
        const chipAddress = chip.address as `0x${string}`;

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

        const nonce = (await publicClient.readContract({
          address: creditTokenAddress,
          abi: CREDIT_TOKEN_ABI,
          functionName: "nonces",
          args: [owner],
        })) as bigint;

        const creditPurchase = {
          buyer: owner,
          usdcAmount: amountInWei,
          nonce,
          deadline,
        };

        setFlowState("confirming_signature");

        const signature = await signTypedData({
          domain: {
            name: "CreditToken",
            version: "1",
            chainId: BigInt(targetNetwork.id),
            verifyingContract: creditTokenAddress,
          },
          types: {
            CreditPurchase: [
              { name: "buyer", type: "address" },
              { name: "usdcAmount", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          primaryType: "CreditPurchase",
          message: creditPurchase,
        });

        if (signature.address.toLowerCase() !== chipAddress.toLowerCase()) {
          throw new Error("Different chip used for signing. Please use the same chip.");
        }

        setFlowState("submitting");

        const walletClient = await getWalletClient();
        const hash = await walletClient.writeContract({
          account: walletClient.account!,
          address: creditTokenAddress,
          abi: CREDIT_TOKEN_ABI,
          chain: baseSepolia,
          functionName: "purchaseCredits",
          args: [creditPurchase, signature.signature as `0x${string}`],
        });

        setTxHash(hash);
        setCreditsMinted(minted);

        setFlowState("confirming");

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error("Credit purchase failed on-chain");
        }

        try {
          const freshClient = createFreshBaseSepoliaPublicClient();
          const balance = (await freshClient.readContract({
            address: creditTokenAddress,
            abi: CREDIT_TOKEN_ABI,
            functionName: "balanceOf",
            args: [owner],
            blockNumber: receipt.blockNumber,
          })) as bigint;

          setNewBalance(balance.toString());
        } catch (balanceError) {
          console.error("Failed to fetch purchased credit balance:", balanceError);
          setNewBalance(minted);
        }

        await triggerCircleAutoSplit({
          userWallet: owner,
          amount: amountInWei.toString(),
          tokenAddress: TOKENS.USDC,
          decimals: 6,
        });

        dispatchClientRefreshEvents({ balances: true });

        setFlowState("success");
        onSuccess?.(hash, minted, owner);
      } catch (err) {
        const normalizedError = err instanceof Error ? err : new Error(parseContractError(err));
        setFlowState("error");
        setError(parseContractError(err) || "Purchase failed. Please try again.");
        onError?.(normalizedError);
      }
    },
    [
      creditTokenAddress,
      registryAddress,
      targetNetwork.id,
      getChipAddress,
      signTypedData,
      getWalletClient,
      publicClient,
      onSuccess,
      onError,
    ],
  );

  const reset = useCallback(() => {
    setFlowState("idle");
    setError("");
    setTxHash(null);
    setCreditsMinted(null);
    setOwnerAddress(null);
    setNewBalance(null);
  }, []);

  const isProcessing = useMemo(
    () => flowState !== "idle" && flowState !== "success" && flowState !== "error",
    [flowState],
  );

  return {
    flowState,
    error,
    txHash,
    creditsMinted,
    ownerAddress,
    newBalance,
    networkName: targetNetwork.name,
    creditTokenAddress,
    purchaseCredits,
    reset,
    isProcessing,
  };
}

import { useCallback, useMemo, useState } from "react";
import { parseUnits } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useEmbeddedWalletClient } from "~~/hooks/useEmbeddedWalletClient";
import { baseSepolia, createBaseSepoliaPublicClient, createFreshBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { CREDIT_TOKEN_ABI, SPLIT_HUB_REGISTRY_ABI } from "~~/lib/contractAbis";
import { parseContractError } from "~~/utils/contractErrors";

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

interface UseCreditSpendOptions {
  onSuccess?: (txHash: string, activityId: number, ownerAddress: string) => void;
  onError?: (error: Error) => void;
}

export function useCreditSpend({ onSuccess, onError }: UseCreditSpendOptions = {}) {
  const { targetNetwork } = useTargetNetwork();
  const { getChipAddress, signTypedData } = useHaloChip();
  const { getWalletClient } = useEmbeddedWalletClient();

  const [flowState, setFlowState] = useState<CreditFlowState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [remainingBalance, setRemainingBalance] = useState<string | null>(null);

  const publicClient = useMemo(() => createBaseSepoliaPublicClient(), []);

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

        const amountInWei = parseUnits(creditAmount.toString(), 18);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

        setFlowState("preparing");
        setStatusMessage("Reading card...");

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

        const creditSpend = {
          spender: owner,
          amount: amountInWei,
          activityId: BigInt(activityId),
          nonce,
          deadline,
        };

        setFlowState("confirming_signature");
        setStatusMessage("Tap again to confirm");

        const signature = await signTypedData({
          domain: {
            name: "CreditToken",
            version: "1",
            chainId: BigInt(targetNetwork.id),
            verifyingContract: creditTokenAddress,
          },
          types: {
            CreditSpend: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
              { name: "activityId", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          primaryType: "CreditSpend",
          message: creditSpend,
        });

        if (signature.address.toLowerCase() !== chipAddress.toLowerCase()) {
          throw new Error("Different chip used for signing. Please use the same chip.");
        }

        setFlowState("submitting");
        setStatusMessage("Sending...");

        const walletClient = await getWalletClient();
        const hash = await walletClient.writeContract({
          account: walletClient.account!,
          address: creditTokenAddress,
          abi: CREDIT_TOKEN_ABI,
          chain: baseSepolia,
          functionName: "spendCredits",
          args: [creditSpend, signature.signature as `0x${string}`],
        });

        setTxHash(hash);

        setFlowState("confirming");
        setStatusMessage("Confirming...");

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error("Credit spend failed on-chain");
        }

        const freshClient = createFreshBaseSepoliaPublicClient();
        const balance = (await freshClient.readContract({
          address: creditTokenAddress,
          abi: CREDIT_TOKEN_ABI,
          functionName: "balanceOf",
          args: [owner],
          blockNumber: receipt.blockNumber,
        })) as bigint;

        setRemainingBalance(balance.toString());
        setFlowState("success");
        setStatusMessage("Complete!");
        onSuccess?.(hash, activityId, owner);
      } catch (err) {
        const normalizedError = err instanceof Error ? err : new Error(parseContractError(err));
        setFlowState("error");
        setError(parseContractError(err) || "Spend failed. Please try again.");
        setStatusMessage("");
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

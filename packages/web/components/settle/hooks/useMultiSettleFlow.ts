import { useCallback, useMemo, useState } from "react";
import { BatchPaymentAuth, Participant } from "../types";
import { encodeFunctionData, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useEmbeddedWalletClient } from "~~/hooks/useEmbeddedWalletClient";
import { useWalletAddress } from "~~/hooks/useWalletAddress";
import { BASE_SEPOLIA_MULTICALL3_ADDRESS, baseSepolia, createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { dispatchClientRefreshEvents } from "~~/lib/clientTransactionUtils";
import { ERC20_ABI, MULTICALL3_ABI, SPLIT_HUB_PAYMENTS_ABI, SPLIT_HUB_REGISTRY_ABI } from "~~/lib/contractAbis";
import { parseContractError } from "~~/utils/contractErrors";

type MultiFlowState = "collecting" | "submitting" | "confirming" | "success" | "error";

interface UseMultiSettleFlowOptions {
  recipient: `0x${string}`;
  token: `0x${string}`;
  amounts: string[];
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

interface UseMultiSettleFlowReturn {
  flowState: MultiFlowState;
  participants: Participant[];
  currentSigningIndex: number | null;
  allSigned: boolean;
  signedCount: number;
  totalCount: number;
  error: string;
  txHash: string | null;
  symbol: string | undefined;
  decimals: number | undefined;
  isConnected: boolean;
  paymentsAddress: `0x${string}` | undefined;
  totalAmount: string;
  signSlot: (slotIndex: number) => Promise<void>;
  submitBatch: () => Promise<void>;
  reset: () => void;
}

export function useMultiSettleFlow({
  recipient,
  token,
  amounts,
  onSuccess,
  onError,
}: UseMultiSettleFlowOptions): UseMultiSettleFlowReturn {
  const { isConnected } = useWalletAddress();
  const { targetNetwork } = useTargetNetwork();
  const { getChipAddress, signTypedData } = useHaloChip();
  const { getWalletClient } = useEmbeddedWalletClient();

  const [participants, setParticipants] = useState<Participant[]>(() =>
    amounts.map((amount, idx) => ({
      id: `slot-${idx}`,
      expectedAmount: amount,
      status: "waiting" as const,
    })),
  );
  const [flowState, setFlowState] = useState<MultiFlowState>("collecting");
  const [currentSigningIndex, setCurrentSigningIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;
  const paymentsAddress = chainContracts?.SplitHubPayments?.address as `0x${string}` | undefined;
  const registryAddress = chainContracts?.SplitHubRegistry?.address as `0x${string}` | undefined;

  const { data: decimals } = useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  const { data: symbol } = useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  const publicClient = useMemo(() => createBaseSepoliaPublicClient(), []);

  const signedCount = participants.filter(p => p.status === "signed").length;
  const totalCount = participants.length;
  const allSigned = signedCount === totalCount;
  const totalAmount = amounts.reduce((sum, amount) => sum + parseFloat(amount || "0"), 0).toString();

  const signSlot = useCallback(
    async (slotIndex: number) => {
      if (slotIndex < 0 || slotIndex >= participants.length) {
        return;
      }

      const participant = participants[slotIndex];

      if (!isConnected) {
        setError("Please connect your wallet first");
        return;
      }

      if (!paymentsAddress || !registryAddress) {
        setError("Contracts not deployed on this network");
        return;
      }

      if (decimals === undefined) {
        setError("Could not read token decimals");
        return;
      }

      setCurrentSigningIndex(slotIndex);
      setParticipants(prev =>
        prev.map((entry, idx) =>
          idx === slotIndex ? { ...entry, status: "signing" as const, error: undefined } : entry,
        ),
      );

      try {
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const amountInWei = parseUnits(participant.expectedAmount, decimals);

        const discoveredChip = await getChipAddress();
        const chipAddress = discoveredChip.address as `0x${string}`;

        const owner = (await publicClient.readContract({
          address: registryAddress,
          abi: SPLIT_HUB_REGISTRY_ABI,
          functionName: "ownerOf",
          args: [chipAddress],
        })) as `0x${string}`;

        if (!owner || owner === "0x0000000000000000000000000000000000000000") {
          throw new Error("Chip not registered. Please register your chip first.");
        }

        const nonce = (await publicClient.readContract({
          address: paymentsAddress,
          abi: SPLIT_HUB_PAYMENTS_ABI,
          functionName: "nonces",
          args: [owner],
        })) as bigint;

        const paymentAuth = {
          payer: owner,
          recipient,
          token,
          amount: amountInWei,
          nonce,
          deadline,
        };

        const signResult = await signTypedData({
          domain: {
            name: "SplitHubPayments",
            version: "1",
            chainId: BigInt(targetNetwork.id),
            verifyingContract: paymentsAddress,
          },
          types: {
            PaymentAuth: [
              { name: "payer", type: "address" },
              { name: "recipient", type: "address" },
              { name: "token", type: "address" },
              { name: "amount", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          primaryType: "PaymentAuth",
          message: paymentAuth,
        });

        if (signResult.address.toLowerCase() !== chipAddress.toLowerCase()) {
          throw new Error("Different chip used for signing. Please use the same chip.");
        }

        setParticipants(prev =>
          prev.map((entry, idx) =>
            idx === slotIndex
              ? {
                  ...entry,
                  status: "signed" as const,
                  chipAddress,
                  payer: owner,
                  signature: signResult.signature,
                  nonce,
                  deadline,
                }
              : entry,
          ),
        );
      } catch (err) {
        const message = parseContractError(err) || "Signing failed";
        console.error("Signing error:", err);
        setParticipants(prev =>
          prev.map((entry, idx) =>
            idx === slotIndex
              ? {
                  ...entry,
                  status: "error" as const,
                  error: message,
                }
              : entry,
          ),
        );
      } finally {
        setCurrentSigningIndex(null);
      }
    },
    [
      participants,
      isConnected,
      paymentsAddress,
      registryAddress,
      decimals,
      recipient,
      token,
      targetNetwork.id,
      getChipAddress,
      signTypedData,
      publicClient,
    ],
  );

  const submitBatch = useCallback(async () => {
    if (!allSigned) {
      setError("Not all participants have signed");
      return;
    }

    if (!paymentsAddress || decimals === undefined) {
      setError("Contract not ready");
      return;
    }

    setFlowState("submitting");
    setError("");

    try {
      const batchAuths: BatchPaymentAuth[] = participants.map(participant => ({
        payer: participant.payer!,
        recipient,
        token,
        amount: parseUnits(participant.expectedAmount, decimals).toString(),
        nonce: participant.nonce!.toString(),
        deadline: participant.deadline!.toString(),
        signature: participant.signature!,
      }));

      const calls = batchAuths.map(payment => ({
        target: paymentsAddress,
        allowFailure: false,
        callData: encodeFunctionData({
          abi: SPLIT_HUB_PAYMENTS_ABI,
          functionName: "executePayment",
          args: [
            {
              payer: payment.payer,
              recipient: payment.recipient,
              token: payment.token,
              amount: BigInt(payment.amount),
              nonce: BigInt(payment.nonce),
              deadline: BigInt(payment.deadline),
            },
            payment.signature as `0x${string}`,
          ],
        }),
      }));

      const walletClient = await getWalletClient();
      const hash = await walletClient.writeContract({
        account: walletClient.account!,
        address: BASE_SEPOLIA_MULTICALL3_ADDRESS,
        abi: MULTICALL3_ABI,
        chain: baseSepolia,
        functionName: "aggregate3",
        args: [calls],
      });

      setFlowState("confirming");
      setTxHash(hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("Batch payment failed on-chain");
      }

      dispatchClientRefreshEvents({ balances: true, paymentRequests: true });

      setFlowState("success");
      onSuccess?.(hash);
    } catch (err) {
      console.error("Batch submit error:", err);
      const normalizedError = err instanceof Error ? err : new Error(parseContractError(err));
      setFlowState("error");
      setError(parseContractError(err) || "Batch submission failed");
      onError?.(normalizedError);
    }
  }, [
    allSigned,
    participants,
    paymentsAddress,
    decimals,
    recipient,
    token,
    getWalletClient,
    publicClient,
    onSuccess,
    onError,
  ]);

  const reset = useCallback(() => {
    setParticipants(
      amounts.map((amount, idx) => ({
        id: `slot-${idx}`,
        expectedAmount: amount,
        status: "waiting" as const,
      })),
    );
    setFlowState("collecting");
    setCurrentSigningIndex(null);
    setError("");
    setTxHash(null);
  }, [amounts]);

  return {
    flowState,
    participants,
    currentSigningIndex,
    allSigned,
    signedCount,
    totalCount,
    error,
    txHash,
    symbol,
    decimals,
    isConnected,
    paymentsAddress,
    totalAmount,
    signSlot,
    submitBatch,
    reset,
  };
}

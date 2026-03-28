"use client";

import { useCallback, useMemo, useState } from "react";
import { parseUnits } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { broadcastRawChipTokenTransfer } from "~~/lib/chipTransactions";
import { ERC20_ABI, SPLIT_HUB_REGISTRY_ABI } from "~~/lib/contractAbis";
import type { Stall } from "~~/lib/events.types";

export type StallPaymentFlowState = "idle" | "tapping" | "submitting" | "confirming" | "success" | "error";

interface UseStallPaymentOptions {
  stall: Stall;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

interface UseStallPaymentReturn {
  flowState: StallPaymentFlowState;
  error: string | null;
  txHash: string | null;
  initiatePayment: (amount: number) => Promise<void>;
  reset: () => void;
}

const CHAIN_ID = 84532;

export function useStallPayment({ stall, onSuccess, onError }: UseStallPaymentOptions): UseStallPaymentReturn {
  const { getChipAddress, signDigest } = useHaloChip();

  const [flowState, setFlowState] = useState<StallPaymentFlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const chainContracts = deployedContracts[CHAIN_ID] as Record<string, { address: string }> | undefined;
  const registryAddress = chainContracts?.SplitHubRegistry?.address as `0x${string}` | undefined;

  const publicClient = useMemo(() => createBaseSepoliaPublicClient(), []);

  const initiatePayment = useCallback(
    async (amount: number) => {
      if (!registryAddress) {
        setError("Registry contract not deployed");
        setFlowState("error");
        return;
      }

      if (!stall.operator_wallet) {
        setError("Stall operator has not registered their wallet");
        setFlowState("error");
        return;
      }

      setError(null);
      setTxHash(null);
      setFlowState("tapping");

      let paymentId: number | null = null;
      let confirmedOnChain = false;
      let confirmedTxHash: `0x${string}` | null = null;

      try {
        const recipient = stall.operator_wallet.toLowerCase() as `0x${string}`;
        const tokenAddress = stall.token_address.toLowerCase() as `0x${string}`;

        const chip = await getChipAddress();
        const chipAddress = chip.address.toLowerCase() as `0x${string}`;

        const payerWallet = (await publicClient.readContract({
          address: registryAddress,
          abi: SPLIT_HUB_REGISTRY_ABI,
          functionName: "ownerOf",
          args: [chipAddress],
        })) as `0x${string}`;

        if (!payerWallet || payerWallet === "0x0000000000000000000000000000000000000000") {
          throw new Error("Chip not registered. Please register your card first at splithub.xyz.");
        }

        const tokenDecimals = (await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "decimals",
        })) as number;

        const amountInWei = parseUnits(amount.toString(), tokenDecimals);

        const createResponse = await fetch("/api/events/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            stallId: stall.id,
            eventId: stall.event_id,
            payerWallet,
            tokenAddress,
            splitPercentage: stall.split_percentage,
            amount: amount.toString(),
          }),
        });

        const createResult = await createResponse.json();
        if (!createResponse.ok) {
          throw new Error(createResult.error || "Failed to create stall payment");
        }

        paymentId = createResult.paymentId;

        setFlowState("submitting");

        const result = await broadcastRawChipTokenTransfer({
          publicClient,
          chipAddress,
          tokenAddress,
          recipient,
          amount: amount.toString(),
          decimals: tokenDecimals,
          signDigest,
        });

        confirmedOnChain = true;
        confirmedTxHash = result.txHash;
        setTxHash(result.txHash);
        setFlowState("confirming");

        const completeResponse = await fetch("/api/events/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete",
            paymentId,
            txHash: result.txHash,
            authAmountWei: amountInWei.toString(),
            tokenDecimals,
          }),
        });

        const completeResult = await completeResponse.json();
        if (!completeResponse.ok) {
          throw new Error(completeResult.error || "Payment confirmed on-chain, but event recording failed.");
        }

        setFlowState("success");
        onSuccess?.(result.txHash);
      } catch (err) {
        console.error("Stall payment error:", err);

        if (paymentId && !confirmedOnChain) {
          try {
            await fetch("/api/events/pay", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "fail",
                paymentId,
              }),
            });
          } catch (failError) {
            console.error("Failed to mark stall payment as failed:", failError);
          }
        }

        const message =
          confirmedOnChain && confirmedTxHash
            ? `Payment confirmed on-chain (${confirmedTxHash.slice(0, 10)}...), but the stall record could not be finalized.`
            : err instanceof Error
              ? err.message
              : "Payment failed";

        setError(message);
        setFlowState("error");
        onError?.(err instanceof Error ? err : new Error(message));
      }
    },
    [registryAddress, stall, publicClient, getChipAddress, signDigest, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setFlowState("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return {
    flowState,
    error,
    txHash,
    initiatePayment,
    reset,
  };
}

"use client";

import { useCallback, useMemo, useState } from "react";
import { createPublicClient, http, parseUnits } from "viem";
import { baseSepolia } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import type { Stall } from "~~/lib/events.types";

export type StallPaymentFlowState = "idle" | "tapping" | "submitting" | "confirming" | "success" | "error";

interface UseStallPaymentOptions {
  stall: Stall;
  eventOwnerWallet: string;
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
const USDC_DECIMALS = 6;

// EIP-712 types matching SplitHubPayments contract
const PAYMENT_AUTH_TYPES = {
  PaymentAuth: [
    { name: "payer", type: "address" },
    { name: "recipient", type: "address" },
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

const REGISTRY_ABI = [
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "signer", type: "address" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

const PAYMENTS_ABI = [
  {
    type: "function",
    name: "nonces",
    inputs: [{ name: "payer", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export function useStallPayment({
  stall,
  eventOwnerWallet,
  onSuccess,
  onError,
}: UseStallPaymentOptions): UseStallPaymentReturn {
  const { signTypedData } = useHaloChip();

  const [flowState, setFlowState] = useState<StallPaymentFlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get contract addresses
  const chainContracts = deployedContracts[CHAIN_ID] as Record<string, { address: string }> | undefined;
  const paymentsAddress = chainContracts?.SplitHubPayments?.address as `0x${string}` | undefined;
  const registryAddress = chainContracts?.SplitHubRegistry?.address as `0x${string}` | undefined;

  // Public client for reading nonces
  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: baseSepolia,
        transport: http(),
      }),
    [],
  );

  const initiatePayment = useCallback(
    async (amount: number) => {
      if (!paymentsAddress || !registryAddress) {
        setError("Contracts not deployed");
        setFlowState("error");
        return;
      }

      setError(null);
      setTxHash(null);
      setFlowState("tapping");

      try {
        // Recipient is event owner (for now - split execution is TODO)
        const recipient = eventOwnerWallet.toLowerCase() as `0x${string}`;
        const token = stall.token_address.toLowerCase() as `0x${string}`;
        const amountInWei = parseUnits(amount.toString(), USDC_DECIMALS);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

        // EIP-712 domain
        const domain = {
          name: "SplitHubPayments",
          version: "1",
          chainId: BigInt(CHAIN_ID),
          verifyingContract: paymentsAddress,
        };

        // For NFC signing, we need a preliminary tap to discover the chip address
        // The libhalo library handles this - we'll use a dummy message first
        // Actually, libhalo's sign command returns the chip's etherAddress
        // We need to do a preliminary signature to get the chip address

        // First: tap to discover chip address using a minimal signature request
        // The HaloChip sign returns { address, signature } where address is the chip's address
        const discovery = await signTypedData({
          domain,
          types: PAYMENT_AUTH_TYPES,
          primaryType: "PaymentAuth",
          message: {
            payer: "0x0000000000000000000000000000000000000001" as `0x${string}`,
            recipient,
            token,
            amount: amountInWei,
            nonce: BigInt(0),
            deadline,
          },
        });

        const chipAddress = discovery.address.toLowerCase() as `0x${string}`;

        // Look up the wallet that owns this chip
        const payerWallet = (await publicClient.readContract({
          address: registryAddress,
          abi: REGISTRY_ABI,
          functionName: "ownerOf",
          args: [chipAddress as `0x${string}`],
        })) as `0x${string}`;

        if (!payerWallet || payerWallet === "0x0000000000000000000000000000000000000000") {
          throw new Error("Chip not registered. Please register your chip first at splithub.xyz");
        }

        // Get current nonce for the payer
        const nonce = (await publicClient.readContract({
          address: paymentsAddress,
          abi: PAYMENTS_ABI,
          functionName: "nonces",
          args: [payerWallet],
        })) as bigint;

        // Build the real PaymentAuth
        const paymentAuth = {
          payer: payerWallet,
          recipient,
          token,
          amount: amountInWei,
          nonce,
          deadline,
        };

        // Second tap: sign the actual payment
        setFlowState("tapping");
        const signResult = await signTypedData({
          domain,
          types: PAYMENT_AUTH_TYPES,
          primaryType: "PaymentAuth",
          message: paymentAuth,
        });

        setFlowState("submitting");

        // Submit to stall payment API
        const response = await fetch("/api/events/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stallId: stall.id,
            eventId: stall.event_id,
            ownerWallet: eventOwnerWallet,
            operatorWallet: stall.operator_wallet,
            splitPercentage: stall.split_percentage,
            amount: amount.toString(),
            auth: {
              payer: paymentAuth.payer,
              recipient: paymentAuth.recipient,
              token: paymentAuth.token,
              amount: paymentAuth.amount.toString(),
              nonce: paymentAuth.nonce.toString(),
              deadline: paymentAuth.deadline.toString(),
            },
            signature: signResult.signature,
            contractAddress: paymentsAddress,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Payment failed");
        }

        setFlowState("confirming");
        setTxHash(result.txHash);

        // Brief delay then success
        await new Promise(resolve => setTimeout(resolve, 800));

        setFlowState("success");
        onSuccess?.(result.txHash);
      } catch (err) {
        console.error("Stall payment error:", err);
        const message = err instanceof Error ? err.message : "Payment failed";
        setError(message);
        setFlowState("error");
        onError?.(err instanceof Error ? err : new Error(message));
      }
    },
    [paymentsAddress, registryAddress, eventOwnerWallet, stall, publicClient, signTypedData, onSuccess, onError],
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

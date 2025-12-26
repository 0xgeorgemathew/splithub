/**
 * Multi-settle flow hook for batch payments using NFC chips
 *
 * ===========================================================================
 * CRITICAL: TWO-TAP FLOW EXPLANATION
 * ===========================================================================
 *
 * This hook implements a multi-payer batch payment flow where each participant
 * must tap their NFC chip TWICE:
 *
 * TAP 1: Get chip address (preliminary signature with placeholder payer)
 * ─────────────────────────────────────────────────────────────────────────
 * Problem: We need to know the payer's wallet address BEFORE they sign the
 * PaymentAuth, but the chip address is only revealed when we tap the chip.
 *
 * Solution: First tap signs a PaymentAuth with payer = 0x000...000 (placeholder).
 * This gives us the chipAddress, which we use to look up the owner from
 * SplitHubRegistry on-chain.
 *
 * TAP 2: Sign the real PaymentAuth with correct payer address
 * ─────────────────────────────────────────────────────────────────────────
 * Now that we know the payer's wallet address (owner of the chip), we can:
 * 1. Fetch their current nonce from SplitHubPayments contract
 * 2. Build the correct PaymentAuth message with real payer address
 * 3. Have them sign it with a second chip tap
 *
 * FLOW STATES:
 * ─────────────────────────────────────────────────────────────────────────
 * - collecting: Gathering signatures from all participants (TAP 1 + TAP 2 per person)
 * - submitting: Sending batch transaction to relayer API
 * - confirming: Waiting for blockchain confirmation
 * - success: Transaction completed successfully
 * - error: Something went wrong at any step
 *
 * PARTICIPANT STATES (per slot):
 * ─────────────────────────────────────────────────────────────────────────
 * - waiting: Not yet started
 * - signing: Currently doing TAP 1 or TAP 2
 * - signed: Both taps complete, signature stored
 * - error: Signing failed
 *
 * SECURITY NOTES:
 * ─────────────────────────────────────────────────────────────────────────
 * - Each PaymentAuth includes a nonce (prevents replay attacks)
 * - Each PaymentAuth includes a deadline (~1 hour, prevents stale signatures)
 * - Contract verifies: registry.ownerOf(signer) == auth.payer
 * - Same chip must be used for both taps (verified client-side)
 */
import { useCallback, useMemo, useState } from "react";
import { BatchPaymentAuth, ERC20_ABI, Participant, SPLIT_HUB_PAYMENTS_ABI, SPLIT_HUB_REGISTRY_ABI } from "../types";
import { createPublicClient, http, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useWalletAddress } from "~~/hooks/useWalletAddress";

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
  const { signTypedData } = useHaloChip();

  // Initialize participants from amounts (payers will be auto-detected)
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

  // Get contract addresses
  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;
  const paymentsAddress = chainContracts?.SplitHubPayments?.address as `0x${string}` | undefined;
  const registryAddress = chainContracts?.SplitHubRegistry?.address as `0x${string}` | undefined;

  // Read token info
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

  // Create public client for contract reads
  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: targetNetwork,
        transport: http(),
      }),
    [targetNetwork],
  );

  // Calculate totals
  const signedCount = participants.filter(p => p.status === "signed").length;
  const totalCount = participants.length;
  const allSigned = signedCount === totalCount;
  const totalAmount = amounts.reduce((sum, a) => sum + parseFloat(a), 0).toString();

  // Sign a slot - auto-detects payer from chip tap
  const signSlot = useCallback(
    async (slotIndex: number) => {
      if (slotIndex < 0 || slotIndex >= participants.length) return;

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

      // Update status to signing
      setCurrentSigningIndex(slotIndex);
      setParticipants(prev =>
        prev.map((p, idx) => (idx === slotIndex ? { ...p, status: "signing" as const, error: undefined } : p)),
      );

      try {
        // Step 1: First, we need to do a preliminary tap to get the chip address
        // We'll create a dummy message to sign just to get the chip address
        // Then look up the owner, build the real PaymentAuth, and sign again

        // Actually, let's think about this differently:
        // The chip signs the PaymentAuth which includes `payer`.
        // But we don't know the payer until we tap!
        //
        // Solution: We need to do the chip tap first with a placeholder,
        // extract the chipAddress from the result, look up owner,
        // then build the correct PaymentAuth and sign again.
        //
        // OR: We can use the chip address as a way to look up owner first,
        // by doing a simple message sign to get the address.

        // Let's do a simple approach: sign a dummy message first to get chip address
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const amountInWei = parseUnits(participant.expectedAmount, decimals);

        // First tap: Get chip address (we'll use a preliminary sign)
        // Actually, looking at the signTypedData, it returns { address, signature }
        // The address IS the chip address. So we need to sign something first.

        // For now, let's sign with payer=0x0 just to get the chip address,
        // then we'll do the real sign with the correct payer
        // This is a bit hacky but works for the PoC

        // Alternative: Use signMessage to just get the address first
        // But that requires another tap...

        // Best approach: Sign the PaymentAuth with a placeholder payer,
        // extract chipAddress, look up owner, verify it matches expectations,
        // then we already have a valid signature because:
        // - The signature is made by the chip
        // - The contract verifies: registry.ownerOf(signer) == auth.payer
        // - So if we set payer = owner of the chip that signed, it will work!

        // Actually wait - the problem is the payer is INSIDE the message being signed.
        // So if we sign with wrong payer, the signature is for wrong message.

        // Real solution: We need TWO taps or use signMessage first.
        // Let's use the simpler approach: sign with a placeholder, get chip,
        // look up owner, then sign AGAIN with correct payer.

        // For better UX, let's do signMessage first to get chipAddress:
        // NO - useHaloChip only has signTypedData exposed properly.

        // Let's just do two signs. First with placeholder to get chip address:
        const placeholderAuth = {
          payer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
          recipient,
          token,
          amount: amountInWei,
          nonce: BigInt(0),
          deadline,
        };

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

        // First tap to get chip address
        const firstTapResult = await signTypedData({
          domain,
          types,
          primaryType: "PaymentAuth",
          message: placeholderAuth,
        });

        const chipAddress = firstTapResult.address as `0x${string}`;

        // Look up owner from registry
        const owner = (await publicClient.readContract({
          address: registryAddress,
          abi: SPLIT_HUB_REGISTRY_ABI,
          functionName: "ownerOf",
          args: [chipAddress],
        })) as `0x${string}`;

        if (!owner || owner === "0x0000000000000000000000000000000000000000") {
          throw new Error("Chip not registered. Please register your chip first.");
        }

        // Now get the correct nonce for this payer
        const nonce = (await publicClient.readContract({
          address: paymentsAddress,
          abi: SPLIT_HUB_PAYMENTS_ABI,
          functionName: "nonces",
          args: [owner],
        })) as bigint;

        // Build the REAL PaymentAuth with correct payer
        const realPaymentAuth = {
          payer: owner,
          recipient,
          token,
          amount: amountInWei,
          nonce,
          deadline,
        };

        // Second tap to sign the real message
        const realTapResult = await signTypedData({
          domain,
          types,
          primaryType: "PaymentAuth",
          message: realPaymentAuth,
        });

        // Verify same chip signed
        if (realTapResult.address !== chipAddress) {
          throw new Error("Different chip used for second tap. Please use the same chip.");
        }

        // Update participant with all the info (including deadline for later submission)
        setParticipants(prev =>
          prev.map((p, idx) =>
            idx === slotIndex
              ? {
                  ...p,
                  status: "signed" as const,
                  chipAddress,
                  payer: owner,
                  signature: realTapResult.signature,
                  nonce,
                  deadline,
                }
              : p,
          ),
        );
      } catch (err: any) {
        console.error("Signing error:", err);
        setParticipants(prev =>
          prev.map((p, idx) =>
            idx === slotIndex
              ? {
                  ...p,
                  status: "error" as const,
                  error: err.message || "Signing failed",
                }
              : p,
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
      signTypedData,
      publicClient,
    ],
  );

  // Submit all signed payments as a batch
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
      // Build batch payload using the deadline that was signed (not a new one!)
      const batchAuths: BatchPaymentAuth[] = participants.map(p => ({
        payer: p.payer!,
        recipient,
        token,
        amount: parseUnits(p.expectedAmount, decimals).toString(),
        nonce: p.nonce!.toString(),
        deadline: p.deadline!.toString(),
        signature: p.signature!,
      }));

      // Submit to batch relay
      const response = await fetch("/api/relay/batch-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payments: batchAuths,
          contractAddress: paymentsAddress,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Batch relay failed");
      }

      setFlowState("confirming");
      setTxHash(result.txHash);

      // Brief delay then success
      await new Promise(resolve => setTimeout(resolve, 1000));

      setFlowState("success");

      if (onSuccess) {
        onSuccess(result.txHash);
      }
    } catch (err: any) {
      console.error("Batch submit error:", err);
      setFlowState("error");
      setError(err.message || "Batch submission failed");

      if (onError) {
        onError(err);
      }
    }
  }, [allSigned, participants, paymentsAddress, decimals, recipient, token, onSuccess, onError]);

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

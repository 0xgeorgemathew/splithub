"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { type PaymentRequest } from "~~/lib/supabase";

export default function SettleRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const router = useRouter();
  const { authenticated, user } = usePrivy();
  const { signTypedData } = useHaloChip();

  const [requestId, setRequestId] = useState<string | null>(null);
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    params.then(p => setRequestId(p.requestId));
  }, [params]);

  useEffect(() => {
    if (!requestId) return;

    const fetchRequest = async () => {
      try {
        const response = await fetch(`/api/payment-requests/${requestId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load request");
        }

        setRequest(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load request");
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [requestId]);

  const handlePay = async () => {
    if (!request || !authenticated || !user?.wallet?.address) return;

    setPaying(true);
    setError(null);

    try {
      // Import dependencies
      const { parseUnits, createPublicClient, http } = await import("viem");
      const deployedContracts = (await import("~~/contracts/deployedContracts")).default;
      const { baseSepolia } = await import("viem/chains");

      const chainId = 84532; // Base Sepolia
      const chainContracts = deployedContracts[chainId as keyof typeof deployedContracts] as
        | Record<string, { address: string; abi: any }>
        | undefined;

      const paymentsAddress = chainContracts?.SplitHubPayments?.address as `0x${string}`;
      const registryAddress = chainContracts?.SplitHubRegistry?.address as `0x${string}`;
      const registryABI = chainContracts?.SplitHubRegistry?.abi;
      const paymentsABI = chainContracts?.SplitHubPayments?.abi;

      if (!paymentsAddress || !registryAddress) {
        throw new Error("Contracts not deployed on this network");
      }

      // Create public client for contract reads
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });

      // Parse amount to wei (assuming USDC with 6 decimals)
      const amountInWei = parseUnits(request.amount, 6);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

      // EIP-712 domain and types matching SplitHubPayments.sol
      const domain = {
        name: "SplitHubPayments",
        version: "1",
        chainId: BigInt(chainId),
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

      // FIRST TAP: Sign with placeholder payer to get chip address
      const placeholderAuth = {
        payer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        recipient: request.recipient as `0x${string}`,
        token: request.token as `0x${string}`,
        amount: amountInWei,
        nonce: BigInt(0),
        deadline,
      };

      const firstTapResult = await signTypedData({
        domain,
        types,
        primaryType: "PaymentAuth",
        message: placeholderAuth,
      });

      const chipAddress = firstTapResult.address as `0x${string}`;

      // Look up chip owner from registry
      const owner = (await publicClient.readContract({
        address: registryAddress,
        abi: registryABI,
        functionName: "ownerOf",
        args: [chipAddress],
      })) as `0x${string}`;

      if (!owner || owner === "0x0000000000000000000000000000000000000000") {
        throw new Error("Chip not registered. Please register your chip first.");
      }

      // Verify the chip owner matches the expected payer
      if (owner.toLowerCase() !== request.payer.toLowerCase()) {
        throw new Error(
          `This chip is registered to ${owner.slice(0, 6)}...${owner.slice(-4)}, but the payment request expects ${request.payer.slice(0, 6)}...${request.payer.slice(-4)}. Please use the correct chip or wallet.`,
        );
      }

      // Get the correct nonce for this payer
      const nonce = (await publicClient.readContract({
        address: paymentsAddress,
        abi: paymentsABI,
        functionName: "nonces",
        args: [owner],
      })) as bigint;

      // SECOND TAP: Sign with correct payer
      const realPaymentAuth = {
        payer: owner,
        recipient: request.recipient as `0x${string}`,
        token: request.token as `0x${string}`,
        amount: amountInWei,
        nonce,
        deadline,
      };

      // Sign with NFC chip
      const chipResult = await signTypedData({
        domain,
        types,
        primaryType: "PaymentAuth",
        message: realPaymentAuth,
      });

      // Submit to relay API
      console.log("Submitting payment to relay API...", {
        payer: realPaymentAuth.payer,
        recipient: realPaymentAuth.recipient,
        amount: realPaymentAuth.amount.toString(),
        contractAddress: paymentsAddress,
      });

      const relayResponse = await fetch("/api/relay/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: {
            payer: realPaymentAuth.payer,
            recipient: realPaymentAuth.recipient,
            token: realPaymentAuth.token,
            amount: realPaymentAuth.amount.toString(),
            nonce: realPaymentAuth.nonce.toString(),
            deadline: realPaymentAuth.deadline.toString(),
          },
          signature: chipResult.signature,
          contractAddress: paymentsAddress,
        }),
      });

      const relayData = await relayResponse.json();

      if (!relayResponse.ok) {
        console.error("Relay API error:", relayData);
        throw new Error(relayData.error || "Payment failed");
      }

      console.log("Payment successful! Transaction hash:", relayData.txHash);

      // Mark request as completed
      const completeResponse = await fetch(`/api/payment-requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: relayData.txHash }),
      });

      if (!completeResponse.ok) {
        console.error("Failed to mark request as completed");
      }

      // Record settlement in database to update balances
      const settlementResponse = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerWallet: realPaymentAuth.payer,
          payeeWallet: request.recipient,
          amount: request.amount,
          tokenAddress: request.token,
          txHash: relayData.txHash,
        }),
      });

      if (!settlementResponse.ok) {
        console.error("Failed to record settlement");
      }

      // Trigger notification badge and balance refresh
      window.dispatchEvent(new Event("refreshPaymentRequests"));
      window.dispatchEvent(new Event("refreshBalances"));

      setSuccess(true);
      setTimeout(() => router.push("/splits"), 2000);
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h1 className="text-xl font-bold mb-2">Error</h1>
        <p className="text-base-content/60 text-center">{error}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <CheckCircle2 className="w-16 h-16 text-success mb-4" />
        <h1 className="text-2xl font-bold mb-2">Payment Sent!</h1>
        <p className="text-base-content/60">Redirecting...</p>
      </div>
    );
  }

  if (request?.status !== "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-base-content/60">This request is {request?.status}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h1 className="text-2xl font-bold mb-4">Payment Request</h1>

            {/* Requester Info */}
            <div className="mb-6">
              {request.recipient_user?.twitter_profile_url && (
                <Image
                  src={request.recipient_user.twitter_profile_url}
                  alt={request.recipient_user.twitter_handle || "User"}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full mx-auto mb-3"
                />
              )}
              <p className="text-base-content/60">Payment to</p>
              <p className="font-semibold text-lg">{request.recipient_user?.name || "Unknown"}</p>
              {request.recipient_user?.twitter_handle && (
                <p className="text-sm text-base-content/60">@{request.recipient_user.twitter_handle}</p>
              )}
            </div>

            {/* Amount */}
            <div className="bg-base-200 rounded-lg p-6 mb-4">
              <p className="text-3xl font-bold">${request.amount} USDC</p>
            </div>

            {/* Memo */}
            {request.memo && (
              <div className="mb-4">
                <p className="text-sm text-base-content/60">Memo:</p>
                <p className="font-medium">{request.memo}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="alert alert-error mb-4">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={handlePay}
              disabled={!authenticated || paying}
              className="btn btn-primary btn-lg w-full gap-2"
            >
              {paying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Tap to Pay"
              )}
            </button>

            {!authenticated && <p className="text-sm text-base-content/60 mt-2">Please login to pay</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

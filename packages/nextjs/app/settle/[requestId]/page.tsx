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
      // Step 1: Sign payment with NFC chip
      const signature = await signTypedData({
        domain: {
          name: "SplitHubPayments",
          version: "1",
          chainId: 84532,
          verifyingContract: "0x...", // Your SplitHubPayments contract address
        },
        types: {
          Payment: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "token", type: "address" },
            { name: "amount", type: "uint256" },
          ],
        },
        primaryType: "Payment",
        message: {
          from: user.wallet.address,
          to: request.recipient,
          token: request.token,
          amount: request.amount,
        },
      });

      // Step 2: Submit to relayer
      const relayResponse = await fetch("/api/relay/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: user.wallet.address,
          to: request.recipient,
          token: request.token,
          amount: request.amount,
          signature: signature.signature,
        }),
      });

      const relayData = await relayResponse.json();

      if (!relayResponse.ok) {
        throw new Error(relayData.error || "Payment failed");
      }

      // Step 3: Mark request as completed
      await fetch(`/api/payment-requests/${requestId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: relayData.txHash }),
      });

      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
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

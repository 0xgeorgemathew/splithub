"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Clock, Sparkles, X } from "lucide-react";
import { SettleFlow } from "~~/components/settle/SettleFlow";
import { PaymentParams } from "~~/components/settle/types";
import { type PaymentRequest } from "~~/lib/supabase";

export default function SettleRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const router = useRouter();
  const [requestId, setRequestId] = useState<string | null>(null);
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleSuccess = useCallback(
    async (txHash: string) => {
      if (!request || !requestId) return;

      try {
        // Mark request as completed
        await fetch(`/api/payment-requests/${requestId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txHash }),
        });

        // Record settlement in database
        await fetch("/api/settlements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payerWallet: request.payer,
            payeeWallet: request.recipient,
            amount: request.amount,
            tokenAddress: request.token,
            txHash,
          }),
        });

        // Trigger refresh events
        window.dispatchEvent(new Event("refreshPaymentRequests"));
        window.dispatchEvent(new Event("refreshBalances"));

        // Navigate immediately
        router.push("/splits");
      } catch (err) {
        console.error("Error completing payment request:", err);
      }
    },
    [request, requestId, router],
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary/50" />
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state (no request loaded)
  if (error && !request) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4"
      >
        <div className="text-center max-w-sm">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-error/10 mb-5"
          >
            <AlertCircle className="w-10 h-10 text-error/70" />
          </motion.div>
          <h1 className="text-xl font-bold text-base-content mb-2">Error</h1>
          <p className="text-base-content/60">{error}</p>
        </div>
      </motion.div>
    );
  }

  // Non-pending request
  if (request?.status !== "pending") {
    const isExpired = request?.status === "expired";
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4"
      >
        <div className="text-center max-w-sm">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 ${
              isExpired ? "bg-warning/10" : "bg-success/10"
            }`}
          >
            {isExpired ? (
              <Clock className="w-10 h-10 text-warning/70" />
            ) : (
              <CheckCircle2 className="w-10 h-10 text-success/70" />
            )}
          </motion.div>
          <h1 className="text-xl font-bold text-base-content mb-2">
            {isExpired ? "Request Expired" : "Already Completed"}
          </h1>
          <p className="text-base-content/60">
            {isExpired ? "This payment request has expired." : "This payment request has already been completed."}
          </p>
        </div>
      </motion.div>
    );
  }

  // Build payment params for SettleFlow
  const paymentParams: PaymentParams = {
    recipient: request.recipient as `0x${string}`,
    token: request.token as `0x${string}`,
    amount: request.amount,
    memo: request.memo || undefined,
    recipientInfo: {
      name: request.recipient_user?.name ?? undefined,
      twitterHandle: request.recipient_user?.twitter_handle ?? undefined,
      profileUrl: request.recipient_user?.twitter_profile_url ?? undefined,
    },
  };

  const displayName = request.recipient_user?.name || "Unknown";

  // Main payment UI - modal overlay style like SettleModal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => router.push("/splits")}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-xs bg-base-200 rounded-3xl shadow-2xl"
      >
        {/* Close Button */}
        <button
          onClick={() => router.push("/splits")}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-base-100/50 hover:bg-base-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-base-content/70" />
        </button>

        {/* Compact Header with Avatar */}
        <div className="pt-4 pb-1 px-4 text-center">
          {/* Avatar */}
          {request.recipient_user?.twitter_profile_url && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-1.5"
            >
              <Image
                src={request.recipient_user.twitter_profile_url}
                alt={displayName}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full mx-auto ring-2 ring-warning/20 ring-offset-2 ring-offset-base-200"
              />
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-[10px] text-base-content/60 mb-0.5"
          >
            You&apos;re paying
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base font-bold text-base-content"
          >
            {displayName}
          </motion.h2>

          {/* Twitter Handle */}
          {request.recipient_user?.twitter_handle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-[10px] text-warning/70"
            >
              @{request.recipient_user.twitter_handle}
            </motion.p>
          )}
        </div>

        {/* Payment Flow */}
        <div className="px-4 pb-4">
          <SettleFlow params={paymentParams} onSuccess={handleSuccess} />
        </div>
      </motion.div>
    </div>
  );
}

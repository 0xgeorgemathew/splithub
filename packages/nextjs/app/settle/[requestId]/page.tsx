"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Clock, Loader2, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { SettleModal, usePaymentRequest } from "~~/components/settle";

interface SettleRequestPageProps {
  params: Promise<{
    requestId: string;
  }>;
}

export default function SettleRequestPage({ params }: SettleRequestPageProps) {
  const { requestId } = use(params);
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { paymentParams, isLoading, error, isExpired, isCompleted, isWrongWallet, markAsCompleted } =
    usePaymentRequest(requestId);

  const handleClose = () => {
    router.push("/");
  };

  const handleSuccess = async (txHash: string) => {
    // Mark the request as completed in the database
    await markAsCompleted(txHash);

    // Redirect after a short delay to show success state
    setTimeout(() => {
      router.push("/");
    }, 2000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-base-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-base-content/60">Loading payment request...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-base-200 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-base-100 rounded-2xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-error/20 mb-4">
            <AlertCircle className="w-8 h-8 text-error" />
          </div>
          <h2 className="text-xl font-bold text-base-content mb-2">Request Not Found</h2>
          <p className="text-base-content/60 mb-6">{error}</p>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-primary text-primary-content rounded-full font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Expired state
  if (isExpired) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-base-200 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-base-100 rounded-2xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warning/20 mb-4">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <h2 className="text-xl font-bold text-base-content mb-2">Request Expired</h2>
          <p className="text-base-content/60 mb-6">This payment request has expired. Please ask for a new link.</p>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-primary text-primary-content rounded-full font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Already completed state
  if (isCompleted) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-base-200 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-base-100 rounded-2xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-base-content mb-2">Already Paid</h2>
          <p className="text-base-content/60 mb-6">This payment request has already been completed.</p>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-primary text-primary-content rounded-full font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-base-200 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-base-100 rounded-2xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-200 mb-4">
            <Wallet className="w-8 h-8 text-base-content/50" />
          </div>
          <h2 className="text-xl font-bold text-base-content mb-2">Connect Wallet</h2>
          <p className="text-base-content/60">Please connect your wallet to complete this payment.</p>
        </div>
      </div>
    );
  }

  // Wrong wallet state
  if (isWrongWallet) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-base-200 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-base-100 rounded-2xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warning/20 mb-4">
            <Wallet className="w-8 h-8 text-warning" />
          </div>
          <h2 className="text-xl font-bold text-base-content mb-2">Wrong Wallet</h2>
          <p className="text-base-content/60 mb-2">This payment request is for a different wallet.</p>
          <p className="text-xs text-base-content/40 font-mono">
            Expected: {paymentParams?.recipient.slice(0, 6)}...{paymentParams?.recipient.slice(-4)}
          </p>
          <p className="text-xs text-base-content/40 font-mono mb-6">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-primary text-primary-content rounded-full font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Show settle modal if we have valid params
  if (!paymentParams) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200">
      <SettleModal isOpen={true} onClose={handleClose} params={paymentParams} onSuccess={handleSuccess} />
    </div>
  );
}

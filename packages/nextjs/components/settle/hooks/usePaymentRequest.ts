import { useEffect, useState } from "react";
import { PaymentParams, PaymentRequest } from "../types";
import { useAccount } from "wagmi";

interface UsePaymentRequestReturn {
  paymentRequest: PaymentRequest | null;
  paymentParams: PaymentParams | null;
  isLoading: boolean;
  error: string | null;
  isExpired: boolean;
  isCompleted: boolean;
  isWrongWallet: boolean;
  markAsCompleted: (txHash: string) => Promise<void>;
}

export function usePaymentRequest(requestId: string | null): UsePaymentRequestReturn {
  const { address } = useAccount();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) {
      setIsLoading(false);
      setError("No request ID provided");
      return;
    }

    const fetchRequest = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/payment-requests/${requestId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Payment request not found");
          }
          if (response.status === 410) {
            throw new Error("Payment request has expired");
          }
          throw new Error("Failed to fetch payment request");
        }

        const data = await response.json();
        setPaymentRequest(data);
      } catch (err: any) {
        setError(err.message || "Failed to load payment request");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequest();
  }, [requestId]);

  // Convert PaymentRequest to PaymentParams for SettleFlow
  const paymentParams: PaymentParams | null = paymentRequest
    ? {
        recipient: paymentRequest.recipient as `0x${string}`,
        token: paymentRequest.token as `0x${string}`,
        amount: paymentRequest.amount,
        memo: paymentRequest.memo || undefined,
      }
    : null;

  // Check if request is expired
  const isExpired = paymentRequest ? new Date(paymentRequest.expires_at) < new Date() : false;

  // Check if request is already completed
  const isCompleted = paymentRequest?.status === "completed";

  // Check if connected wallet matches the expected payer
  const isWrongWallet =
    paymentRequest && address ? paymentRequest.payer.toLowerCase() !== address.toLowerCase() : false;

  // Function to mark request as completed
  const markAsCompleted = async (txHash: string) => {
    if (!requestId) return;

    try {
      const response = await fetch(`/api/payment-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "completed",
          tx_hash: txHash,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update payment request");
      }

      // Update local state
      setPaymentRequest(prev =>
        prev
          ? {
              ...prev,
              status: "completed",
              tx_hash: txHash,
            }
          : null,
      );
    } catch (err) {
      console.error("Failed to mark payment as completed:", err);
    }
  };

  return {
    paymentRequest,
    paymentParams,
    isLoading,
    error,
    isExpired,
    isCompleted,
    isWrongWallet,
    markAsCompleted,
  };
}

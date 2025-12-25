"use client";

import { useCallback, useEffect, useState } from "react";
import { type PaymentRequest } from "~~/lib/supabase";

/**
 * Hook to fetch and manage a payment request by ID
 *
 * Handles loading, error states, and auto-refresh on mount.
 *
 * @param requestId - Payment request ID (null to skip fetch)
 */
export function usePaymentRequestById(requestId: string | null) {
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    if (!requestId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

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
  }, [requestId]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const refetch = useCallback(() => {
    fetchRequest();
  }, [fetchRequest]);

  return {
    request,
    loading,
    error,
    refetch,
  };
}

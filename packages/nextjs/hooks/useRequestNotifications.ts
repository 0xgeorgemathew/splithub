import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { PaymentRequest, RealtimeChannel, supabase } from "~~/lib/supabase";

export const useRequestNotifications = () => {
  const { user, authenticated } = usePrivy();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  const wallet = authenticated ? (user?.wallet?.address?.toLowerCase() ?? null) : null;

  // Fetch current pending count
  const fetchCount = useCallback(async () => {
    if (!wallet) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("id")
        .eq("payer", wallet)
        .eq("status", "pending");

      if (!error && isMountedRef.current) {
        setCount(data?.length ?? 0);
      }
    } catch (err) {
      console.error("Error fetching notification count:", err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [wallet]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!wallet) {
      setCount(0);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchCount();

    // Subscribe to Realtime changes
    const channel = supabase
      .channel(`payment_requests_${wallet}`)
      .on<PaymentRequest>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_requests",
          filter: `payer=eq.${wallet}`,
        },
        payload => {
          if (!isMountedRef.current) return;

          const { eventType, new: newRec, old: oldRec } = payload;
          const newRecord = newRec as PaymentRequest;
          const oldRecord = oldRec as PaymentRequest;

          if (eventType === "INSERT") {
            if (newRecord.status === "pending") {
              setCount(prev => prev + 1);
            }
          } else if (eventType === "UPDATE") {
            const wasPending = oldRecord.status === "pending";
            const isPending = newRecord.status === "pending";
            if (wasPending && !isPending) {
              setCount(prev => Math.max(0, prev - 1));
            } else if (!wasPending && isPending) {
              setCount(prev => prev + 1);
            }
          } else if (eventType === "DELETE") {
            if (oldRecord.status === "pending") {
              setCount(prev => Math.max(0, prev - 1));
            }
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    // Re-sync on window focus (fallback)
    const handleFocus = () => fetchCount();
    window.addEventListener("focus", handleFocus);

    // Legacy event support
    const handleRefresh = () => fetchCount();
    window.addEventListener("refreshPaymentRequests", handleRefresh);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("refreshPaymentRequests", handleRefresh);
    };
  }, [wallet, fetchCount]);

  return { count, loading, refresh: fetchCount };
};

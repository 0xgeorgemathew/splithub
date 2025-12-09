import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { PaymentRequest, RealtimeChannel, supabase } from "~~/lib/supabase";

type RequestType = "incoming" | "outgoing";

export const usePaymentRequestsRealtime = (type: RequestType) => {
  const { user, authenticated } = usePrivy();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  const wallet = authenticated ? (user?.wallet?.address?.toLowerCase() ?? null) : null;

  // Fetch requests from Supabase
  const fetchRequests = useCallback(async () => {
    if (!wallet) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Build query based on type
      const filterColumn = type === "incoming" ? "payer" : "recipient";

      const { data, error: fetchError } = await supabase
        .from("payment_requests")
        .select(
          `
          *,
          recipient_user:users!payment_requests_recipient_fkey(name, twitter_handle, twitter_profile_url),
          payer_user:users!payment_requests_payer_fkey(name, twitter_handle, twitter_profile_url)
        `,
        )
        .eq(filterColumn, wallet)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      if (isMountedRef.current) {
        // Flatten the joined data
        const formattedData = (data || []).map((req: any) => ({
          ...req,
          recipient_user: req.recipient_user?.[0] || req.recipient_user || null,
          payer_user: req.payer_user?.[0] || req.payer_user || null,
        }));
        setRequests(formattedData);
      }
    } catch (err) {
      console.error("Error fetching payment requests:", err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load requests");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [wallet, type]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!wallet) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchRequests();

    // Subscribe to Realtime changes
    const filterColumn = type === "incoming" ? "payer" : "recipient";
    const channel = supabase
      .channel(`payment_requests_list_${type}_${wallet}`)
      .on<PaymentRequest>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_requests",
          filter: `${filterColumn}=eq.${wallet}`,
        },
        () => {
          // Re-fetch to get joined user data
          if (isMountedRef.current) {
            fetchRequests();
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    // Re-sync on window focus
    const handleFocus = () => fetchRequests();
    window.addEventListener("focus", handleFocus);

    // Legacy event support
    const handleRefresh = () => fetchRequests();
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
  }, [wallet, type, fetchRequests]);

  return { requests, loading, error, refresh: fetchRequests };
};

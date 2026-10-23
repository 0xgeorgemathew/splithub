import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { Event, Stall, StallPayment } from "~~/lib/events.types";
import { RealtimeChannel, supabase } from "~~/lib/supabase";
import { getEventsByOwner, getStallsByOperator } from "~~/services/eventsService";

export type EventWithStats = Event & {
  totalRevenue: number;
  stallCount: number;
  stalls?: Stall[];
};

export const useEventsRealtime = () => {
  const { user, authenticated } = usePrivy();
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelsRef = useRef<RealtimeChannel[]>([]);
  const isMountedRef = useRef(true);

  const wallet = authenticated ? (user?.wallet?.address?.toLowerCase() ?? null) : null;

  // Fetch events with stats
  const fetchEvents = useCallback(async () => {
    if (!wallet) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch events with stalls
      const userEvents = await getEventsByOwner(wallet);

      // Calculate stats for each event
      const eventsWithStats: EventWithStats[] = await Promise.all(
        userEvents.map(async event => {
          const stallCount = event.stalls?.length || 0;

          // Get total revenue from completed payments
          let totalRevenue = 0;
          if (event.stalls && event.stalls.length > 0) {
            const stallIds = event.stalls.map(s => s.id);
            const { data: payments } = await supabase
              .from("stall_payments")
              .select("amount")
              .in("stall_id", stallIds)
              .eq("status", "completed");

            if (payments) {
              totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
            }
          }

          return {
            ...event,
            totalRevenue,
            stallCount,
          };
        }),
      );

      if (isMountedRef.current) {
        setEvents(eventsWithStats);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [wallet]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!wallet) {
      setEvents([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchEvents();

    // Subscribe to events changes
    const eventsChannel = supabase
      .channel(`events_${wallet}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        fetchEvents,
      )
      .subscribe();

    // Subscribe to stalls changes
    const stallsChannel = supabase
      .channel(`stalls_${wallet}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stalls",
        },
        fetchEvents,
      )
      .subscribe();

    // Subscribe to stall_payments changes
    const paymentsChannel = supabase
      .channel(`stall_payments_${wallet}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stall_payments",
        },
        fetchEvents,
      )
      .subscribe();

    channelsRef.current = [eventsChannel, stallsChannel, paymentsChannel];

    // Re-sync on window focus
    const handleFocus = () => fetchEvents();
    window.addEventListener("focus", handleFocus);

    // Custom event support
    const handleRefresh = () => fetchEvents();
    window.addEventListener("refreshEvents", handleRefresh);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("refreshEvents", handleRefresh);
    };
  }, [wallet, fetchEvents]);

  return { events, loading, error, refresh: fetchEvents };
};

// Hook for stall payments realtime
export const useStallPaymentsRealtime = (stallId: number | null) => {
  const [payments, setPayments] = useState<StallPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const isMountedRef = useRef(true);

  const fetchPayments = useCallback(async () => {
    if (!stallId) {
      setPayments([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("stall_payments")
        .select(
          `
          *,
          payer_user:users!payer_wallet(name, twitter_handle, twitter_profile_url)
        `,
        )
        .eq("stall_id", stallId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      if (isMountedRef.current) {
        setPayments((data || []) as StallPayment[]);
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [stallId]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!stallId) {
      setPayments([]);
      setLoading(false);
      return;
    }

    fetchPayments();

    // Subscribe to stall_payments changes for this stall
    const channel = supabase
      .channel(`stall_payments_stall_${stallId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stall_payments",
          filter: `stall_id=eq.${stallId}`,
        },
        fetchPayments,
      )
      .subscribe();

    channelsRef.current = [channel];

    return () => {
      isMountedRef.current = false;
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [stallId, fetchPayments]);

  return { payments, loading, refresh: fetchPayments };
};

// Type for operator stall with stats
export type OperatorStallWithStats = Stall & {
  totalRevenue: number;
  operatorEarnings: number;
  transactionCount: number;
  eventName: string;
  eventSlug: string;
  eventStatus: string;
};

// Hook for stall operators to see their stalls with real-time updates
export const useOperatorStallsRealtime = () => {
  const { user, authenticated } = usePrivy();
  const [stalls, setStalls] = useState<OperatorStallWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelsRef = useRef<RealtimeChannel[]>([]);
  const isMountedRef = useRef(true);

  const wallet = authenticated ? (user?.wallet?.address?.toLowerCase() ?? null) : null;

  // Fetch operator's stalls with stats
  const fetchStalls = useCallback(async () => {
    if (!wallet) {
      setStalls([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch stalls where user is operator
      const operatorStalls = await getStallsByOperator(wallet);

      // Calculate stats for each stall
      const stallsWithStats: OperatorStallWithStats[] = await Promise.all(
        operatorStalls.map(async stall => {
          // Get payments for this stall
          const { data: payments } = await supabase
            .from("stall_payments")
            .select("amount, operator_amount, status")
            .eq("stall_id", stall.id)
            .eq("status", "completed");

          const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;
          const operatorEarnings = payments?.reduce((sum, p) => sum + parseFloat(p.operator_amount.toString()), 0) || 0;
          const transactionCount = payments?.length || 0;

          // Extract event info from joined data
          const event = stall.event as Event | undefined;

          return {
            ...stall,
            totalRevenue,
            operatorEarnings,
            transactionCount,
            eventName: event?.event_name || "Unknown Event",
            eventSlug: event?.event_slug || "",
            eventStatus: event?.status || "unknown",
          };
        }),
      );

      if (isMountedRef.current) {
        setStalls(stallsWithStats);
      }
    } catch (err) {
      console.error("Error fetching operator stalls:", err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load stalls");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [wallet]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!wallet) {
      setStalls([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchStalls();

    // Subscribe to stalls changes (for status updates, etc.)
    const stallsChannel = supabase
      .channel(`operator_stalls_${wallet}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stalls",
          filter: `operator_wallet=eq.${wallet}`,
        },
        fetchStalls,
      )
      .subscribe();

    // Subscribe to stall_payments changes
    // Note: We subscribe to all payments and filter in fetchStalls
    // because Supabase doesn't support complex filters on realtime
    const paymentsChannel = supabase
      .channel(`operator_payments_${wallet}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stall_payments",
        },
        fetchStalls,
      )
      .subscribe();

    channelsRef.current = [stallsChannel, paymentsChannel];

    // Re-sync on window focus
    const handleFocus = () => fetchStalls();
    window.addEventListener("focus", handleFocus);

    // Custom event support
    const handleRefresh = () => fetchStalls();
    window.addEventListener("refreshOperatorStalls", handleRefresh);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("refreshOperatorStalls", handleRefresh);
    };
  }, [wallet, fetchStalls]);

  // Calculate totals
  const totals = {
    totalEarnings: stalls.reduce((sum, s) => sum + s.operatorEarnings, 0),
    totalRevenue: stalls.reduce((sum, s) => sum + s.totalRevenue, 0),
    totalTransactions: stalls.reduce((sum, s) => sum + s.transactionCount, 0),
    stallCount: stalls.length,
  };

  return { stalls, loading, error, refresh: fetchStalls, totals };
};

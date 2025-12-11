"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { Event, Stall, StallPayment } from "~~/lib/events.types";
import { RealtimeChannel, supabase } from "~~/lib/supabase";

// View modes based on user's role
export type DashboardMode = "empty" | "operator" | "owner";

// Extended payment type with joined data for the feed
export type FeedPayment = StallPayment & {
  payer_user?: {
    name: string;
    twitter_handle: string | null;
    twitter_profile_url: string | null;
  };
  stall?: {
    stall_name: string;
    event_id: number;
  };
};

// Metrics for the hero section
export interface DashboardMetrics {
  // Owner metrics
  totalRevenue: number;
  eventCount: number;
  stallCount: number;
  activeEvents: number;
  // Operator metrics
  operatorEarnings: number;
  operatorStallCount: number;
  operatorTransactions: number;
}

export interface UseDashboardRealtimeReturn {
  mode: DashboardMode;
  metrics: DashboardMetrics;
  feed: FeedPayment[];
  events: Event[];
  operatorStalls: Stall[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const initialMetrics: DashboardMetrics = {
  totalRevenue: 0,
  eventCount: 0,
  stallCount: 0,
  activeEvents: 0,
  operatorEarnings: 0,
  operatorStallCount: 0,
  operatorTransactions: 0,
};

export const useDashboardRealtime = (): UseDashboardRealtimeReturn => {
  const { user, authenticated } = usePrivy();
  const [mode, setMode] = useState<DashboardMode>("empty");
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [feed, setFeed] = useState<FeedPayment[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [operatorStalls, setOperatorStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  const wallet = authenticated ? (user?.wallet?.address?.toLowerCase() ?? null) : null;

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!wallet) {
      setMode("empty");
      setMetrics(initialMetrics);
      setFeed([]);
      setEvents([]);
      setOperatorStalls([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Parallel fetch: events (as owner) and stalls (as operator)
      const [eventsResult, operatorStallsResult] = await Promise.all([
        // Fetch events where user is owner
        supabase
          .from("events")
          .select(
            `
            *,
            owner_user:users!owner_wallet(name, twitter_handle, twitter_profile_url),
            stalls(*)
          `,
          )
          .eq("owner_wallet", wallet)
          .order("created_at", { ascending: false }),

        // Fetch stalls where user is operator
        supabase
          .from("stalls")
          .select(
            `
            *,
            event:events!event_id(id, event_name, event_slug, owner_wallet, status),
            operator_user:users!operator_wallet(name, twitter_handle, twitter_profile_url)
          `,
          )
          .eq("operator_wallet", wallet)
          .order("created_at", { ascending: false }),
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (operatorStallsResult.error) throw operatorStallsResult.error;

      const userEvents = (eventsResult.data || []) as Event[];
      const userOperatorStalls = (operatorStallsResult.data || []) as Stall[];

      // Determine mode: Priority is Operator > Owner > Empty
      let newMode: DashboardMode = "empty";
      if (userOperatorStalls.length > 0) {
        newMode = "operator";
      } else if (userEvents.length > 0) {
        newMode = "owner";
      }

      // Get all stall IDs for feed query
      const allStallIds: number[] = [];

      // Stalls from owned events
      userEvents.forEach(event => {
        if (event.stalls) {
          event.stalls.forEach(stall => allStallIds.push(stall.id));
        }
      });

      // Stalls user operates
      userOperatorStalls.forEach(stall => {
        if (!allStallIds.includes(stall.id)) {
          allStallIds.push(stall.id);
        }
      });

      // Fetch payments for feed and metrics
      let payments: FeedPayment[] = [];
      let ownerRevenue = 0;
      let operatorEarnings = 0;
      let operatorTransactions = 0;

      if (allStallIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("stall_payments")
          .select(
            `
            *,
            payer_user:users!payer_wallet(name, twitter_handle, twitter_profile_url),
            stall:stalls!stall_id(stall_name, event_id)
          `,
          )
          .in("stall_id", allStallIds)
          .order("created_at", { ascending: false })
          .limit(20);

        if (paymentsError) throw paymentsError;
        payments = (paymentsData || []) as FeedPayment[];

        // Calculate metrics from all completed payments
        const { data: allPayments } = await supabase
          .from("stall_payments")
          .select("amount, operator_amount, stall_id, status")
          .in("stall_id", allStallIds)
          .eq("status", "completed");

        if (allPayments) {
          // Calculate owner revenue (from owned events' stalls)
          const ownedStallIds = userEvents.flatMap(e => e.stalls?.map(s => s.id) || []);
          ownerRevenue = allPayments
            .filter(p => ownedStallIds.includes(p.stall_id))
            .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

          // Calculate operator earnings (from operated stalls)
          const operatedStallIds = userOperatorStalls.map(s => s.id);
          const operatorPayments = allPayments.filter(p => operatedStallIds.includes(p.stall_id));
          operatorEarnings = operatorPayments.reduce((sum, p) => sum + parseFloat(p.operator_amount.toString()), 0);
          operatorTransactions = operatorPayments.length;
        }
      }

      if (isMountedRef.current) {
        setMode(newMode);
        setEvents(userEvents);
        setOperatorStalls(userOperatorStalls);
        setFeed(payments);
        setMetrics({
          totalRevenue: ownerRevenue,
          eventCount: userEvents.length,
          stallCount: userEvents.reduce((sum, e) => sum + (e.stalls?.length || 0), 0),
          activeEvents: userEvents.filter(e => e.status === "active").length,
          operatorEarnings,
          operatorStallCount: userOperatorStalls.length,
          operatorTransactions,
        });
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [wallet]);

  // Handle new payment from realtime
  const handleNewPayment = useCallback(async (payload: { new: StallPayment }) => {
    const newPayment = payload.new;

    // Fetch the full payment data with joins
    const { data } = await supabase
      .from("stall_payments")
      .select(
        `
          *,
          payer_user:users!payer_wallet(name, twitter_handle, twitter_profile_url),
          stall:stalls!stall_id(stall_name, event_id)
        `,
      )
      .eq("id", newPayment.id)
      .single();

    if (data && isMountedRef.current) {
      const payment = data as FeedPayment;

      // Add to feed (prepend) with deduplication check
      setFeed(prev => {
        const exists = prev.some(p => p.id === payment.id);
        if (exists) return prev;
        return [payment, ...prev].slice(0, 20);
      });

      // Update metrics if completed
      if (payment.status === "completed") {
        setMetrics(prev => ({
          ...prev,
          totalRevenue: prev.totalRevenue + parseFloat(payment.amount.toString()),
          operatorEarnings: prev.operatorEarnings + parseFloat(payment.operator_amount.toString()),
          operatorTransactions: prev.operatorTransactions + 1,
        }));
      }

      // Play notification sound (optional)
      try {
        const audio = new Audio("/sounds/payment.mp3");
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch {}
    }
  }, []);

  // Setup realtime subscriptions
  useEffect(() => {
    isMountedRef.current = true;

    if (!wallet) {
      setMode("empty");
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchDashboardData();

    // Create realtime channel
    const channel = supabase
      .channel(`dashboard_${wallet}`)
      // Listen for new payments
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stall_payments",
        },
        handleNewPayment,
      )
      // Listen for payment updates (status changes)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "stall_payments",
        },
        () => fetchDashboardData(),
      )
      // Listen for new stalls
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stalls",
        },
        () => fetchDashboardData(),
      )
      // Listen for event changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        () => fetchDashboardData(),
      )
      .subscribe();

    channelRef.current = channel;

    // Re-sync on window focus
    const handleFocus = () => fetchDashboardData();
    window.addEventListener("focus", handleFocus);

    // Custom event support
    const handleRefresh = () => fetchDashboardData();
    window.addEventListener("refreshDashboard", handleRefresh);

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("refreshDashboard", handleRefresh);
    };
  }, [wallet, fetchDashboardData, handleNewPayment]);

  return {
    mode,
    metrics,
    feed,
    events,
    operatorStalls,
    loading,
    error,
    refresh: fetchDashboardData,
  };
};

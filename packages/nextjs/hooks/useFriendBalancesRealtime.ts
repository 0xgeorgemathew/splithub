import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { FriendBalance, RealtimeChannel, supabase } from "~~/lib/supabase";
import { getFriendBalances, getOverallBalance } from "~~/services/balanceService";

export const useFriendBalancesRealtime = () => {
  const { user, authenticated } = usePrivy();
  const [balances, setBalances] = useState<FriendBalance[]>([]);
  const [overallBalance, setOverallBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelsRef = useRef<RealtimeChannel[]>([]);
  const isMountedRef = useRef(true);

  const wallet = authenticated ? (user?.wallet?.address?.toLowerCase() ?? null) : null;

  // Fetch balances using existing service
  const fetchBalances = useCallback(async () => {
    if (!wallet) {
      setBalances([]);
      setOverallBalance(0);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const [friendBalances, overall] = await Promise.all([getFriendBalances(wallet), getOverallBalance(wallet)]);

      if (isMountedRef.current) {
        setBalances(friendBalances);
        setOverallBalance(overall);
      }
    } catch (err) {
      console.error("Error fetching balances:", err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load balances");
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
      setBalances([]);
      setOverallBalance(0);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchBalances();

    // Subscribe to expense_participants changes
    // This covers both when user creates expenses and when they're added to expenses
    const expenseParticipantsChannel = supabase
      .channel(`expense_participants_${wallet}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expense_participants",
        },
        () => {
          if (isMountedRef.current) {
            fetchBalances();
          }
        },
      )
      .subscribe();

    // Subscribe to settlements changes
    const settlementsChannel = supabase
      .channel(`settlements_${wallet}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settlements",
        },
        () => {
          if (isMountedRef.current) {
            fetchBalances();
          }
        },
      )
      .subscribe();

    // Subscribe to expense changes (for status updates)
    const expenseChannel = supabase
      .channel(`expense_${wallet}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expense",
        },
        () => {
          if (isMountedRef.current) {
            fetchBalances();
          }
        },
      )
      .subscribe();

    channelsRef.current = [expenseParticipantsChannel, settlementsChannel, expenseChannel];

    // Re-sync on window focus
    const handleFocus = () => fetchBalances();
    window.addEventListener("focus", handleFocus);

    // Legacy event support
    const handleRefresh = () => fetchBalances();
    window.addEventListener("refreshBalances", handleRefresh);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("refreshBalances", handleRefresh);
    };
  }, [wallet, fetchBalances]);

  return { balances, overallBalance, loading, error, refresh: fetchBalances };
};

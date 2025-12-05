import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

export const useRequestNotifications = () => {
  const { user, authenticated } = usePrivy();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotificationCount = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) {
      setCount(0);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/payment-requests?wallet=${user.wallet.address}&type=incoming`);
      const data = await response.json();

      if (response.ok && data.data) {
        // Count only pending incoming requests
        const pendingCount = data.data.filter((req: any) => req.status === "pending").length;
        setCount(pendingCount);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [authenticated, user?.wallet?.address]);

  useEffect(() => {
    fetchNotificationCount();

    // Refresh every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);

    // Listen for custom refresh events
    const handleRefresh = () => {
      fetchNotificationCount();
    };
    window.addEventListener("refreshPaymentRequests", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("refreshPaymentRequests", handleRefresh);
    };
  }, [fetchNotificationCount]);

  // Expose refresh function for manual updates
  return { count, loading, refresh: fetchNotificationCount };
};

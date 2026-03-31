"use client";

import { useCallback, useEffect, useState } from "react";

export interface VincentSecretState {
  status: "unknown" | "not_configured" | "configured" | "error";
  eoaAddress?: string;
  smartAccountAddress?: string;
  error?: string;
}

/**
 * Hook to check the status of the shared SplitHub Vincent Smart Wallet.
 *
 * Calls GET /api/vincent/secret to determine whether Vincent is
 * provisioned and to resolve the wallet addresses.
 */
export function useVincentSecret() {
  const [state, setState] = useState<VincentSecretState>({ status: "unknown" });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vincent/secret");
      const data = await res.json();

      if (data.status === "not_configured") {
        setState({ status: "not_configured" });
      } else if (data.status === "configured") {
        setState({
          status: "configured",
          eoaAddress: data.eoaAddress,
          smartAccountAddress: data.smartAccountAddress,
        });
      } else {
        setState({ status: "error", error: data.error || "Unknown response" });
      }
    } catch (err) {
      setState({ status: "error", error: err instanceof Error ? err.message : "Fetch failed" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, loading, refresh };
}

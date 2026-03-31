"use client";

import { useCallback, useEffect, useState } from "react";

export interface VincentSessionState {
  status: "unknown" | "not_configured" | "needs_connect" | "authenticated" | "error";
  configured: boolean;
  authenticated: boolean;
  appId?: number;
  delegateeAddress?: string;
  pkpAddress?: string;
  agentAddress?: string;
  error?: string;
}

export function useVincentSession() {
  const [state, setState] = useState<VincentSessionState>({
    status: "unknown",
    configured: false,
    authenticated: false,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vincent/session", { credentials: "include" });
      const data = (await res.json()) as VincentSessionState;

      if (!res.ok) {
        throw new Error(data.error || "Failed to load Vincent session");
      }

      setState(data);
    } catch (error) {
      setState({
        status: "error",
        configured: false,
        authenticated: false,
        error: error instanceof Error ? error.message : "Failed to load Vincent session",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = useCallback((returnTo?: string) => {
    const target = returnTo || `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/api/vincent/connect?returnTo=${encodeURIComponent(target)}`);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/vincent/logout", { method: "POST" });
    await refresh();
  }, [refresh]);

  return { ...state, loading, refresh, connect, logout };
}

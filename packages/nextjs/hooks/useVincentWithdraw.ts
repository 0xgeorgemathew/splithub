"use client";

import { useCallback, useState } from "react";

type WithdrawState = "idle" | "executing" | "success" | "error";

interface WithdrawResult {
  success: boolean;
  txHash?: string;
  vincentStatus?: "executed" | "denied" | "pending_approval";
  error?: string;
}

/**
 * Hook to execute an Aave withdraw through Vincent.
 * Used when the liquid reserve has a shortfall and funds need to be pulled
 * from Aave to cover a pending payment.
 */
export function useVincentWithdraw() {
  const [state, setState] = useState<WithdrawState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WithdrawResult | null>(null);

  const withdraw = useCallback(async (amount: string) => {
    setState("executing");
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/vincent/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Withdraw failed");
      }

      const data: WithdrawResult = await res.json();
      setResult(data);
      setState(data.success ? "success" : "error");

      if (!data.success && data.error) {
        setError(data.error);
      }

      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Withdraw failed";
      setError(msg);
      setState("error");
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setResult(null);
  }, []);

  return { state, error, result, withdraw, reset };
}

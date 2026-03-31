"use client";

import { useCallback, useState } from "react";
import { usePublicClient } from "wagmi";
import { useFundAgentWallet } from "~~/hooks/useFundAgentWallet";

type PositionState = "idle" | "planning" | "funding" | "executing" | "success" | "error";

interface OpenPositionResult {
  plan: {
    targetReserveUsd: string;
    actions: Array<{ type: string; asset?: string; amount?: string }>;
    reasoning: string;
  };
  source: "llm" | "fallback";
  fundRequired: boolean;
  fundAmount: string | null;
  executionResults: Array<{
    action: string;
    success: boolean;
    txHash?: string;
    vincentStatus?: string;
    error?: string;
  }>;
}

/**
 * Hook for the one-click open position flow.
 *
 * Orchestrates:
 * 1. Plan generation (server-side)
 * 2. Optional funding step (client-side Privy wallet)
 * 3. Aave supply execution (Vincent server-side)
 */
export function useVincentOpenPosition() {
  const publicClient = usePublicClient();
  const { fund } = useFundAgentWallet();
  const [state, setState] = useState<PositionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OpenPositionResult | null>(null);

  const openPosition = useCallback(
    async (walletAddress: string) => {
      setState("planning");
      setError(null);
      setResult(null);

      try {
        let res = await fetch("/api/vincent/open-position", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Open position failed");
        }

        let data: OpenPositionResult = await res.json();

        if (data.fundRequired && data.fundAmount) {
          setState("funding");
          const { hash } = await fund(data.fundAmount);

          if (!publicClient) {
            throw new Error("Missing public client for funding confirmation");
          }

          await publicClient.waitForTransactionReceipt({ hash });

          setState("executing");
          res = await fetch("/api/vincent/open-position", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress }),
          });

          if (!res.ok) {
            const retryData = await res.json();
            throw new Error(retryData.error || "Open position failed after funding");
          }

          data = await res.json();
        }

        setResult(data);

        // Check if all executions succeeded
        const hasNoAction = data.plan.actions.every(action => action.type === "no_action");
        const allSuccess = data.executionResults.every(r => r.success);
        setState(hasNoAction || allSuccess ? "success" : "error");

        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Open position failed";
        setError(msg);
        setState("error");
        throw err;
      }
    },
    [fund, publicClient],
  );

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setResult(null);
  }, []);

  return { state, error, result, openPosition, reset };
}

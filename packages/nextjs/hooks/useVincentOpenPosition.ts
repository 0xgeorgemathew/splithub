"use client";

import { useCallback, useState } from "react";
import { usePublicClient } from "wagmi";
import { type VincentFundingStep, useFundAgentWallet } from "~~/hooks/useFundAgentWallet";

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
  fundSteps?: VincentFundingStep[];
  executionResults: Array<{
    action: string;
    success: boolean;
    txHash?: string;
    vincentStatus?: string;
    error?: string;
  }>;
}

async function parseResponseBody(response: Response) {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
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
          const data = await parseResponseBody(res);
          const message =
            typeof data === "string"
              ? data
              : data && typeof data === "object" && "error" in data && typeof data.error === "string"
                ? data.error
                : "Open position failed";
          throw new Error(message);
        }

        let data = (await parseResponseBody(res)) as OpenPositionResult;

        if (data.fundRequired && (data.fundSteps?.length || data.fundAmount)) {
          setState("funding");
          const fundSteps = data.fundSteps?.length
            ? data.fundSteps
            : [{ asset: "USDC" as const, amount: data.fundAmount! }];
          const { hashes } = await fund(fundSteps);

          if (!publicClient) {
            throw new Error("Missing public client for funding confirmation");
          }

          for (const hash of hashes) {
            await publicClient.waitForTransactionReceipt({ hash });
          }

          setState("executing");
          res = await fetch("/api/vincent/open-position", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress, skipFunding: true }),
          });

          if (!res.ok) {
            const retryData = await parseResponseBody(res);
            const message =
              typeof retryData === "string"
                ? retryData
                : retryData &&
                    typeof retryData === "object" &&
                    "error" in retryData &&
                    typeof retryData.error === "string"
                  ? retryData.error
                  : "Open position failed after funding";
            throw new Error(message);
          }

          data = (await parseResponseBody(res)) as OpenPositionResult;
        }

        setResult(data);

        // Check if all executions succeeded
        const hasNoAction = data.plan.actions.every(action => action.type === "no_action");
        const allSuccess = data.executionResults.every(r => r.success);
        if (!hasNoAction && !allSuccess) {
          const failedExecution = data.executionResults.find(execution => !execution.success);
          setError(failedExecution?.error || "Open position execution failed");
        }

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

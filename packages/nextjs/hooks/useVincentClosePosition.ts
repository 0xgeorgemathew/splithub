"use client";

import { useCallback, useState } from "react";

type ClosePositionState = "idle" | "executing" | "success" | "error";

interface ClosePositionResult {
  amount: string;
  completedAt: string;
  withdrawResult: {
    success: boolean;
    txHash?: string;
    vincentStatus?: "executed" | "denied" | "pending_approval";
    error?: string;
  };
  transferResult: {
    success: boolean;
    txHash?: string;
    vincentStatus?: "executed" | "denied" | "pending_approval";
    error?: string;
  };
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

export function useVincentClosePosition() {
  const [state, setState] = useState<ClosePositionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClosePositionResult | null>(null);

  const closePosition = useCallback(async (walletAddress: string) => {
    setState("executing");
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/vincent/close-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await parseResponseBody(res);
      if (!res.ok) {
        const message =
          typeof data === "string"
            ? data
            : data && typeof data === "object" && "error" in data && typeof data.error === "string"
              ? data.error
              : "Close position failed";
        throw new Error(message);
      }

      setResult(data as ClosePositionResult);
      setState("success");
      return data as ClosePositionResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Close position failed";
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

  return { state, error, result, closePosition, reset };
}

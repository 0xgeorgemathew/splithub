"use client";

import { useCallback, useState } from "react";
import { useSendTransaction } from "wagmi";

type FundState = "idle" | "building" | "signing" | "submitting" | "success" | "error";

/**
 * Hook to fund the shared Vincent agent wallet from the user's Privy wallet.
 *
 * Flow:
 * 1. Call POST /api/vincent/fund-agent to get unsigned tx data
 * 2. Submit through wagmi's sendTransaction (Privy embedded wallet signs)
 */
export function useFundAgentWallet() {
  const [state, setState] = useState<FundState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { sendTransactionAsync } = useSendTransaction();

  const fund = useCallback(
    async (amount: string) => {
      setState("building");
      setError(null);
      setTxHash(null);

      try {
        // 1. Get unsigned tx from backend
        const res = await fetch("/api/vincent/fund-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to build funding tx");
        }

        const { tx, targetSmartAccount } = await res.json();

        // 2. Submit through Privy embedded wallet
        setState("signing");

        const hash = await sendTransactionAsync({
          to: tx.to as `0x${string}`,
          data: tx.data as `0x${string}`,
          value: BigInt(tx.value),
        });

        setTxHash(hash);
        setState("success");

        return { hash, targetSmartAccount };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Funding failed";
        setError(msg);
        setState("error");
        throw err;
      }
    },
    [sendTransactionAsync],
  );

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return { state, error, txHash, fund, reset };
}

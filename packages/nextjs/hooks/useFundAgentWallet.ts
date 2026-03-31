"use client";

import { useCallback, useState } from "react";
import { useEmbeddedWalletClient } from "~~/hooks/useEmbeddedWalletClient";

type FundState = "idle" | "building" | "signing" | "submitting" | "success" | "error";
export interface VincentFundingStep {
  asset: "USDC" | "ETH";
  amount: string;
  reason?: "agent_liquidity" | "agent_gas";
}

/**
 * Hook to fund the authenticated Vincent wallet from the user's Privy wallet.
 *
 * Flow:
 * 1. Call POST /api/vincent/fund-agent to get unsigned tx data
 * 2. Submit through the embedded Privy wallet client
 */
export function useFundAgentWallet() {
  const [state, setState] = useState<FundState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { sendTransaction } = useEmbeddedWalletClient();

  const fund = useCallback(
    async (steps: VincentFundingStep[] | string) => {
      setState("building");
      setError(null);
      setTxHash(null);

      try {
        const fundingSteps = typeof steps === "string" ? [{ asset: "USDC" as const, amount: steps }] : steps;
        const hashes: `0x${string}`[] = [];
        let lastResponse: { hash: `0x${string}`; targetSmartAccount: string; targetVincentWallet: string } | null =
          null;

        for (const step of fundingSteps) {
          // 1. Get unsigned tx from backend
          const res = await fetch("/api/vincent/fund-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: step.amount, asset: step.asset }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to build funding tx");
          }

          const { tx, targetSmartAccount, targetVincentWallet } = await res.json();

          // 2. Submit through Privy embedded wallet
          setState("signing");

          const hash = await sendTransaction({
            to: tx.to as `0x${string}`,
            data: tx.data as `0x${string}`,
            value: BigInt(tx.value),
          });

          hashes.push(hash);
          setTxHash(hash);
          lastResponse = { hash, targetSmartAccount, targetVincentWallet };
        }

        setState("success");

        if (!lastResponse) {
          throw new Error("No funding transaction was created");
        }

        return { ...lastResponse, hashes };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Funding failed";
        setError(msg);
        setState("error");
        throw err;
      }
    },
    [sendTransaction],
  );

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return { state, error, txHash, fund, reset };
}

"use client";

import { useCallback, useEffect, useState } from "react";

export interface WalletSnapshot {
  privyUsdc: string;
  agentLiquidUsdc: string;
  agentAaveSuppliedUsdc: string;
  agentAaveWithdrawableUsdc: string;
  agentAssetSymbol: string;
  agentAddresses: {
    eoaAddress: string;
    smartAccountAddress: string;
  };
}

export interface SpendSignals {
  pendingRequestsUsd: string;
  sevenDayMedianSpendUsd: string;
  maxSingleExpectedSpendUsd: string;
}

interface VincentWalletsState {
  snapshot: WalletSnapshot | null;
  spendSignals: SpendSignals | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch the combined wallet snapshot and spend signals.
 */
export function useVincentWallets(walletAddress: string | undefined) {
  const [state, setState] = useState<VincentWalletsState>({
    snapshot: null,
    spendSignals: null,
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!walletAddress) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`/api/vincent/wallets?walletAddress=${walletAddress}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch");
      }

      const { snapshot, spendSignals } = await res.json();
      setState({ snapshot, spendSignals, loading: false, error: null });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Fetch failed",
      }));
    }
  }, [walletAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

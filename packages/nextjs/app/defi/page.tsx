"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { LoaderCircle } from "lucide-react";
import { useVincentOpenPosition } from "~~/hooks/useVincentOpenPosition";
import { useVincentSecret } from "~~/hooks/useVincentSecret";
import { useVincentWallets } from "~~/hooks/useVincentWallets";

function formatUsd(value?: string) {
  if (!value) return "--";
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "--";
}

export default function DefiPage() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const { status: vincentStatus, error: vincentError } = useVincentSecret();
  const { snapshot, error: walletError, refresh } = useVincentWallets(walletAddress);
  const { state, error: openError, result, openPosition } = useVincentOpenPosition();

  const isVincentReady = vincentStatus === "configured";
  const isBusy = state === "planning" || state === "funding" || state === "executing";

  const handleOpenPosition = useCallback(async () => {
    if (!walletAddress) return;
    try {
      await openPosition(walletAddress);
      refresh();
    } catch {
      // handled in hook state
    }
  }, [openPosition, refresh, walletAddress]);

  return (
    <div className="px-4 py-4 pb-24 md:px-6 lg:px-8 max-w-md md:max-w-lg lg:max-w-xl mx-auto">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-base-content">DeFi</h1>
          <p className="mt-1 text-sm text-base-content/60">
            Deploy idle Vincent balance into Aave. Tap payments refill only when needed.
          </p>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-base-content">Vincent</p>
              <p className="text-xs text-base-content/60">
                {isVincentReady ? "Connected" : vincentStatus === "not_configured" ? "Not configured" : "Checking"}
              </p>
            </div>
            <span
              className={`badge ${
                isVincentReady
                  ? "badge-success"
                  : vincentStatus === "error" || vincentStatus === "not_configured"
                  ? "badge-error"
                  : "badge-ghost"
              }`}
            >
              {isVincentReady ? "Ready" : "Not ready"}
            </span>
          </div>
          {vincentError && <p className="mt-3 text-xs text-error">{vincentError}</p>}
          {snapshot?.agentAssetSymbol && (
            <p className="mt-3 text-xs text-base-content/50">Tracked reserve asset: {snapshot.agentAssetSymbol}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <p className="text-xs uppercase tracking-wide text-base-content/50">Privy wallet</p>
            <p className="mt-2 text-2xl font-bold text-base-content">{formatUsd(snapshot?.privyUsdc)}</p>
          </div>
          <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <p className="text-xs uppercase tracking-wide text-base-content/50">Agent wallet liquid</p>
            <p className="mt-2 text-2xl font-bold text-base-content">{formatUsd(snapshot?.agentLiquidUsdc)}</p>
          </div>
          <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <p className="text-xs uppercase tracking-wide text-base-content/50">Deployed in Aave</p>
            <p className="mt-2 text-2xl font-bold text-base-content">{formatUsd(snapshot?.agentAaveSuppliedUsdc)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-100 p-4 space-y-3">
          <p className="text-sm font-semibold text-base-content">Actions</p>
          <button
            type="button"
            onClick={handleOpenPosition}
            disabled={!walletAddress || !isVincentReady || isBusy}
            className="btn btn-primary w-full"
          >
            {isBusy ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {state === "funding" ? "Funding Vincent..." : "Deploying to Aave..."}
              </>
            ) : (
              "Deploy Idle Balance"
            )}
          </button>
          <Link href="/agents-pay" className="btn btn-outline w-full">
            Open Agents Pay
          </Link>
          {!walletAddress && <p className="text-xs text-warning">Connect Privy wallet first.</p>}
          {walletError && <p className="text-xs text-error">{walletError}</p>}
          {!isVincentReady && vincentStatus !== "unknown" && (
            <p className="text-xs text-warning">Set `VINCENT_API_KEY` correctly or Vincent actions stay disabled.</p>
          )}
          {openError && <p className="text-xs text-error">{openError}</p>}
        </div>

        {result && (
          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 space-y-2">
            <p className="text-sm font-semibold text-base-content">Planner</p>
            <p className="text-sm text-base-content/70">{result.plan.reasoning}</p>
            <p className="text-xs text-base-content/50">Source: {result.source}</p>
            <div className="space-y-1">
              {result.plan.actions.map((action, index) => (
                <p key={`${action.type}-${index}`} className="text-xs text-base-content/70">
                  {action.type === "no_action" ? "No action needed" : `${action.type}: ${action.amount}`}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

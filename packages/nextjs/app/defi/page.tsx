"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { LoaderCircle } from "lucide-react";
import { useVincentClosePosition } from "~~/hooks/useVincentClosePosition";
import { useVincentOpenPosition } from "~~/hooks/useVincentOpenPosition";
import { useVincentSession } from "~~/hooks/useVincentSession";
import { useVincentWallets } from "~~/hooks/useVincentWallets";

function formatUsd(value?: string) {
  if (!value) return "--";
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "--";
}

function getVincentStatusLabel(status: "unknown" | "not_configured" | "needs_connect" | "authenticated" | "error") {
  if (status === "authenticated") return "Connected";
  if (status === "not_configured") return "Not configured";
  if (status === "needs_connect") return "Authorization required";
  return "Checking";
}

function getVincentBadgeClass(status: "unknown" | "not_configured" | "needs_connect" | "authenticated" | "error") {
  if (status === "authenticated") return "badge-success";
  if (status === "error" || status === "not_configured") return "badge-error";
  return "badge-ghost";
}

function getVincentBadgeText(status: "unknown" | "not_configured" | "needs_connect" | "authenticated" | "error") {
  if (status === "authenticated") return "Ready";
  if (status === "needs_connect") return "Connect";
  return "Not ready";
}

export default function DefiPage() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const { status: vincentStatus, authenticated, error: vincentError, connect, pkpAddress } = useVincentSession();
  const { snapshot, error: walletError, refresh } = useVincentWallets(authenticated ? walletAddress : undefined);
  const { state, error: openError, result, openPosition } = useVincentOpenPosition();
  const { state: closeState, error: closeError, result: closeResult, closePosition } = useVincentClosePosition();

  const isVincentReady = vincentStatus === "authenticated";
  const isOpening = state === "planning" || state === "funding" || state === "executing";
  const isClosing = closeState === "executing";
  const deployableBalance =
    Number.parseFloat(snapshot?.privyUsdc ?? "0") + Number.parseFloat(snapshot?.agentLiquidUsdc ?? "0");
  const hasDeployableBalance = Number.isFinite(deployableBalance) && deployableBalance > 0;
  const agentLiquidBalance = Number.parseFloat(snapshot?.agentLiquidUsdc ?? "0");
  const hasAgentLiquidBalance = Number.isFinite(agentLiquidBalance) && agentLiquidBalance > 0;
  const aaveBalance = Number.parseFloat(snapshot?.agentAaveWithdrawableUsdc ?? "0");
  const hasAaveBalance = Number.isFinite(aaveBalance) && aaveBalance > 0;
  const hasWithdrawableBalance = hasAaveBalance || hasAgentLiquidBalance;

  const schedulePostActionRefresh = useCallback(() => {
    const delays = [1500, 5000];
    for (const delay of delays) {
      window.setTimeout(() => {
        void refresh();
      }, delay);
    }
  }, [refresh]);

  const handleOpenPosition = useCallback(async () => {
    if (!walletAddress) return;
    try {
      await openPosition(walletAddress);
      await refresh();
      schedulePostActionRefresh();
    } catch {
      // handled in hook state
    }
  }, [openPosition, refresh, schedulePostActionRefresh, walletAddress]);

  const handleClosePosition = useCallback(async () => {
    if (!walletAddress) return;
    try {
      await closePosition(walletAddress);
      await refresh();
      schedulePostActionRefresh();
    } catch {
      // handled in hook state
    }
  }, [closePosition, refresh, schedulePostActionRefresh, walletAddress]);

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
              <p className="text-xs text-base-content/60">{getVincentStatusLabel(vincentStatus)}</p>
            </div>
            <span className={`badge ${getVincentBadgeClass(vincentStatus)}`}>{getVincentBadgeText(vincentStatus)}</span>
          </div>
          {vincentError && <p className="mt-3 text-xs text-error">{vincentError}</p>}
          {pkpAddress && (
            <p className="mt-3 text-xs text-base-content/50">
              Vincent wallet: {pkpAddress.slice(0, 6)}...{pkpAddress.slice(-4)}
            </p>
          )}
          {snapshot?.agentAssetSymbol && authenticated && (
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
          {!authenticated && vincentStatus === "needs_connect" && (
            <button type="button" onClick={() => connect("/defi")} className="btn btn-secondary w-full">
              Connect Vincent
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenPosition}
            disabled={!walletAddress || !isVincentReady || isOpening || isClosing || !hasDeployableBalance}
            className="btn btn-primary w-full"
          >
            {isOpening ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {state === "funding" ? "Funding Vincent..." : "Deploying to Aave..."}
              </>
            ) : (
              "Deploy All To Aave"
            )}
          </button>
          <button
            type="button"
            onClick={handleClosePosition}
            disabled={!walletAddress || !isVincentReady || isOpening || isClosing || !hasWithdrawableBalance}
            className="btn btn-outline w-full"
          >
            {isClosing ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Returning Vincent funds...
              </>
            ) : (
              "Withdraw All To Privy Wallet"
            )}
          </button>
          <Link href="/agents-pay" className="btn btn-outline w-full">
            Open Agents Pay
          </Link>
          {!walletAddress && <p className="text-xs text-warning">Connect Privy wallet first.</p>}
          {walletError && <p className="text-xs text-error">{walletError}</p>}
          {vincentStatus === "not_configured" && (
            <p className="text-xs text-warning">
              Set `VINCENT_DELEGATEE_PRIVATE_KEY` or `RELAYER_PRIVATE_KEY` for Vincent actions.
            </p>
          )}
          {vincentStatus === "needs_connect" && (
            <p className="text-xs text-warning">Authorize SplitHub in Vincent before DeFi actions can run.</p>
          )}
          {openError && <p className="text-xs text-error">{openError}</p>}
          {closeError && <p className="text-xs text-error">{closeError}</p>}
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

        {closeResult && (
          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 space-y-2">
            <p className="text-sm font-semibold text-base-content">Aave Unwind</p>
            <p className="text-sm text-base-content/70">
              Returned {formatUsd(closeResult.amount)} from Vincent&apos;s Aave position to your Privy wallet.
            </p>
            <p className="text-xs text-base-content/50">Withdraw tx: {closeResult.withdrawResult.txHash ?? "--"}</p>
            <p className="text-xs text-base-content/50">Transfer tx: {closeResult.transferResult.txHash ?? "--"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

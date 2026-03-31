"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { LoaderCircle } from "lucide-react";
import { DEFAULT_AGENT_PAY_TEST_RECIPIENT } from "~~/constants/agentPay";
import { useVincentSession } from "~~/hooks/useVincentSession";

interface Readiness {
  canCoverTap: boolean;
  tapLimitUsd: string;
  chipWalletBalanceUsd: string;
  agentLiquidUsd: string;
  aaveReserveUsd: string;
  topUpRequiredUsd: string;
  withdrawNeededNow: boolean;
  maxRecentSpendUsd: string;
}

function formatUsd(value?: string) {
  if (!value) return "--";
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "--";
}

function getStatusCopy(readiness: Readiness | null, loading: boolean) {
  if (loading) {
    return {
      title: "Checking...",
      badge: "Unknown",
      badgeClass: "badge-ghost",
    };
  }

  if (!readiness) {
    return {
      title: "Waiting for Vincent",
      badge: "Unknown",
      badgeClass: "badge-ghost",
    };
  }

  const topUpRequired = Number.parseFloat(readiness.topUpRequiredUsd);

  if (!readiness.canCoverTap) {
    return {
      title: "Tap limit exceeds current wallet plus Aave backing",
      badge: "Needs funds",
      badgeClass: "badge-warning",
    };
  }

  if (topUpRequired <= 0) {
    return {
      title: "Chip wallet already covers the current tap limit",
      badge: "Ready now",
      badgeClass: "badge-success",
    };
  }

  return {
    title: "Vincent can top up the missing amount before the tap payment runs",
    badge: "Top-up ready",
    badgeClass: "badge-success",
  };
}

export default function AgentsPayPage() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const { status: vincentStatus, authenticated, connect, error: vincentError } = useVincentSession();

  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [tapLimitInput, setTapLimitInput] = useState("50.00");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const isVincentReady = authenticated;
  const statusCopy = getStatusCopy(readiness, loading);

  const fetchState = useCallback(async () => {
    if (!walletAddress || !isVincentReady) return;

    setLoading(true);
    setError(null);

    try {
      const [readinessRes, tapLimitRes] = await Promise.all([
        fetch(`/api/vincent/readiness?walletAddress=${walletAddress}`),
        fetch(`/api/user/tap-limit?walletAddress=${walletAddress}`),
      ]);

      if (!readinessRes.ok) {
        const data = await readinessRes.json().catch(() => null);
        throw new Error(data?.error || "Failed to load JIT pay status");
      }

      if (!tapLimitRes.ok) {
        const data = await tapLimitRes.json().catch(() => null);
        throw new Error(data?.error || "Failed to load tap limit");
      }

      const readinessData = (await readinessRes.json()) as Readiness;
      const tapLimitData = (await tapLimitRes.json()) as { tapLimitUsd: string };

      setReadiness(readinessData);
      setTapLimitInput(tapLimitData.tapLimitUsd);
    } catch (err) {
      setReadiness(null);
      setError(err instanceof Error ? err.message : "Failed to load JIT pay status");
    } finally {
      setLoading(false);
    }
  }, [isVincentReady, walletAddress]);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  const handleSaveTapLimit = useCallback(async () => {
    if (!walletAddress) return;

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/user/tap-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          tapLimitUsd: tapLimitInput,
        }),
      });

      const data = (await res.json().catch(() => null)) as { tapLimitUsd?: string; error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save tap limit");
      }

      if (data?.tapLimitUsd) {
        setTapLimitInput(data.tapLimitUsd);
      }

      setSaveMessage("Tap limit updated.");
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tap limit");
    } finally {
      setSaving(false);
    }
  }, [fetchState, tapLimitInput, walletAddress]);

  return (
    <div className="px-4 py-4 pb-24 md:px-6 lg:px-8 max-w-md md:max-w-lg lg:max-w-xl mx-auto">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-base-content">Agents Pay</h1>
          <p className="mt-1 text-sm text-base-content/60">
            Vincent funds the chip wallet only when a tap actually needs it.
          </p>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-base-content">JIT status</p>
              <p className="text-xs text-base-content/60">
                {authenticated ? statusCopy.title : "Connect Vincent to evaluate chip top-up readiness."}
              </p>
            </div>
            <span className={`badge ${authenticated ? statusCopy.badgeClass : "badge-ghost"}`}>
              {authenticated ? statusCopy.badge : "Connect"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <p className="text-xs uppercase tracking-wide text-base-content/50">Tap limit</p>
            <p className="mt-2 text-2xl font-bold text-base-content">{formatUsd(readiness?.tapLimitUsd)}</p>
          </div>
          <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <p className="text-xs uppercase tracking-wide text-base-content/50">Chip wallet balance</p>
            <p className="mt-2 text-2xl font-bold text-base-content">{formatUsd(readiness?.chipWalletBalanceUsd)}</p>
          </div>
          <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <p className="text-xs uppercase tracking-wide text-base-content/50">Vincent Aave backing</p>
            <p className="mt-2 text-2xl font-bold text-base-content">{formatUsd(readiness?.aaveReserveUsd)}</p>
          </div>
          <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <p className="text-xs uppercase tracking-wide text-base-content/50">Top-up needed now</p>
            <p className="mt-2 text-2xl font-bold text-base-content">{formatUsd(readiness?.topUpRequiredUsd)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-100 p-4 space-y-3">
          <p className="text-sm font-semibold text-base-content">Test payment</p>
          <p className="text-xs text-base-content/60">
            Default test recipient: {DEFAULT_AGENT_PAY_TEST_RECIPIENT.slice(0, 6)}...
            {DEFAULT_AGENT_PAY_TEST_RECIPIENT.slice(-4)}
          </p>
          <Link href="/settle" className="btn btn-outline w-full">
            Open test payment
          </Link>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-100 p-4 space-y-3">
          <p className="text-sm font-semibold text-base-content">Tap limit</p>
          {!authenticated && vincentStatus === "needs_connect" && (
            <button type="button" onClick={() => connect("/agents-pay")} className="btn btn-secondary w-full">
              Connect Vincent
            </button>
          )}
          <label className="form-control">
            <span className="label-text text-xs text-base-content/60">Max amount Vincent can top up for a tap</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={tapLimitInput}
              onChange={event => setTapLimitInput(event.target.value)}
              className="input input-bordered w-full mt-2"
            />
          </label>

          <button
            type="button"
            onClick={handleSaveTapLimit}
            disabled={!walletAddress || !isVincentReady || saving}
            className="btn btn-primary w-full"
          >
            {saving ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save tap limit"
            )}
          </button>

          {readiness && (
            <p className="text-xs text-base-content/60">
              Recent reference point: {formatUsd(readiness.maxRecentSpendUsd)}. Aave withdraw is{" "}
              {readiness.withdrawNeededNow ? "required" : "not required"} for the current shortfall.
            </p>
          )}
          {!walletAddress && <p className="text-xs text-warning">Connect Privy wallet first.</p>}
          {vincentStatus === "not_configured" && (
            <p className="text-xs text-warning">
              Set `VINCENT_DELEGATEE_PRIVATE_KEY` or `RELAYER_PRIVATE_KEY` for Vincent funding.
            </p>
          )}
          {vincentStatus === "needs_connect" && (
            <p className="text-xs text-warning">Authorize SplitHub in Vincent before JIT funding can run.</p>
          )}
          {vincentError && <p className="text-xs text-error">{vincentError}</p>}
          {error && <p className="text-xs text-error">{error}</p>}
          {saveMessage && <p className="text-xs text-success">{saveMessage}</p>}
        </div>
      </div>
    </div>
  );
}

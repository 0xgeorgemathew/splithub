"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { ArrowUpRight, CreditCard, LoaderCircle, Radio, ShieldCheck, Zap } from "lucide-react";
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

function fmt(value?: string) {
  if (!value) return "--";
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "--";
}

function getStatusBadge(readiness: Readiness | null, loading: boolean) {
  if (loading || !readiness) return { text: loading ? "Checking" : "Waiting", cls: "bg-white/10 text-white/50" };
  if (!readiness.canCoverTap) return { text: "Needs funds", cls: "bg-amber-500/20 text-amber-300" };
  const topUp = Number.parseFloat(readiness.topUpRequiredUsd);
  if (topUp <= 0) return { text: "Ready", cls: "bg-emerald-500/20 text-emerald-300" };
  return { text: "Top-up ready", cls: "bg-emerald-500/20 text-emerald-300" };
}

const cardBg: React.CSSProperties = {
  background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
  boxShadow: "0 4px 20px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
};

const glow: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(at 15% 25%, rgba(125, 211, 252, 0.10) 0%, transparent 45%), radial-gradient(at 85% 75%, rgba(52, 211, 153, 0.08) 0%, transparent 45%)",
};

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
  const badge = getStatusBadge(readiness, loading);

  const fetchState = useCallback(async () => {
    if (!walletAddress || !isVincentReady) return;
    setLoading(true);
    setError(null);
    try {
      const [rRes, tRes] = await Promise.all([
        fetch(`/api/vincent/readiness?walletAddress=${walletAddress}`),
        fetch(`/api/user/tap-limit?walletAddress=${walletAddress}`),
      ]);
      if (!rRes.ok) throw new Error((await rRes.json().catch(() => null))?.error || "Failed to load JIT status");
      if (!tRes.ok) throw new Error((await tRes.json().catch(() => null))?.error || "Failed to load tap limit");
      setReadiness((await rRes.json()) as Readiness);
      setTapLimitInput(((await tRes.json()) as { tapLimitUsd: string }).tapLimitUsd);
    } catch (err) {
      setReadiness(null);
      setError(err instanceof Error ? err.message : "Failed to load JIT status");
    } finally {
      setLoading(false);
    }
  }, [isVincentReady, walletAddress]);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  const handleSave = useCallback(async () => {
    if (!walletAddress) return;
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/user/tap-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, tapLimitUsd: tapLimitInput }),
      });
      const data = (await res.json().catch(() => null)) as { tapLimitUsd?: string; error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      if (data?.tapLimitUsd) setTapLimitInput(data.tapLimitUsd);
      setSaveMessage("Saved");
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [fetchState, tapLimitInput, walletAddress]);

  return (
    <div className="px-4 pt-[76px] pb-[76px] md:px-6 lg:px-8 max-w-md md:max-w-lg lg:max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl relative overflow-hidden border border-white/[0.06]"
        style={cardBg}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 opacity-40" style={glow} />

        <div className="relative">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center border border-sky-500/10">
                <Zap className="w-[18px] h-[18px] text-sky-300" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-none">Agents Pay</h1>
                <p className="text-[11px] text-white/35 mt-0.5 leading-tight">JIT funding on tap</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-[5px] rounded-full text-[10px] font-bold uppercase tracking-wider ${
                authenticated ? badge.cls : "bg-white/10 text-white/50"
              }`}
            >
              {authenticated ? badge.text : "Connect"}
            </span>
          </div>

          <div className="h-px bg-white/[0.06] mx-5" />

          {/* ── 2×2 Metric Grid ── */}
          <div className="grid grid-cols-2 gap-px mx-5 mt-4 bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04]">
            {/* Tap Limit */}
            <div className="bg-[#111] px-4 py-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5 text-amber-300/80" />
                <span className="text-[10px] font-semibold text-amber-300/60 uppercase tracking-[0.1em]">
                  Tap limit
                </span>
              </div>
              <p className="text-[20px] font-bold text-white font-mono tracking-tight leading-none">
                {fmt(readiness?.tapLimitUsd)}
              </p>
            </div>
            {/* Chip Balance */}
            <div className="bg-[#111] px-4 py-3.5 border-l border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-2">
                <CreditCard className="w-3.5 h-3.5 text-sky-300/80" />
                <span className="text-[10px] font-semibold text-sky-300/60 uppercase tracking-[0.1em]">Chip</span>
              </div>
              <p className="text-[20px] font-bold text-white font-mono tracking-tight leading-none">
                {fmt(readiness?.chipWalletBalanceUsd)}
              </p>
            </div>
            {/* Aave Backing */}
            <div className="bg-[#111] px-4 py-3.5 border-t border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-2">
                <Radio className="w-3.5 h-3.5 text-emerald-400/80" />
                <span className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-[0.1em]">
                  Aave back
                </span>
              </div>
              <p className="text-[20px] font-bold text-white font-mono tracking-tight leading-none">
                {fmt(readiness?.aaveReserveUsd)}
              </p>
            </div>
            {/* Top-up Needed */}
            <div className="bg-[#111] px-4 py-3.5 border-t border-l border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-300/80" />
                <span className="text-[10px] font-semibold text-rose-300/60 uppercase tracking-[0.1em]">Top-up</span>
              </div>
              <p className="text-[20px] font-bold text-white font-mono tracking-tight leading-none">
                {fmt(readiness?.topUpRequiredUsd)}
              </p>
            </div>
          </div>

          {/* ── Reference line ── */}
          {readiness && (
            <p className="mx-5 mt-2 text-[10px] text-white/25 leading-tight">
              Ref: {fmt(readiness.maxRecentSpendUsd)} &middot; Aave withdraw {readiness.withdrawNeededNow ? "" : "not "}
              required
            </p>
          )}

          <div className="h-px bg-white/[0.06] mx-5 mt-3" />

          {/* ── Tap Limit Input ── */}
          <div className="px-5 pt-4 pb-1">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.1em] mb-2">Tap limit</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-white/25 font-semibold pointer-events-none">
                  $
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={tapLimitInput}
                  onChange={e => setTapLimitInput(e.target.value)}
                  className="w-full h-10 pl-7 pr-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm font-mono
                             focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20
                             placeholder:text-white/20 transition-colors"
                  placeholder="0.00"
                />
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={!walletAddress || !isVincentReady || saving}
                className="btn btn-primary btn-sm h-10 min-h-0 px-5 text-xs font-semibold"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>

          <div className="h-px bg-white/[0.06] mx-5 mt-3" />

          {/* ── Actions ── */}
          <div className="px-5 pt-4 pb-5 space-y-2">
            {!authenticated && vincentStatus === "needs_connect" && (
              <button
                type="button"
                onClick={() => connect("/agents-pay")}
                className="btn btn-secondary btn-sm h-10 min-h-0 w-full text-xs"
              >
                Connect Vincent
              </button>
            )}
            <Link
              href="/settle"
              className="btn btn-outline btn-sm h-10 min-h-0 w-full text-xs flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Test payment
              <span className="text-white/25 font-mono text-[10px]">
                {DEFAULT_AGENT_PAY_TEST_RECIPIENT.slice(0, 6)}...{DEFAULT_AGENT_PAY_TEST_RECIPIENT.slice(-4)}
              </span>
            </Link>

            {/* Inline messages */}
            {!walletAddress && (
              <p className="text-[10px] text-amber-300/70 text-center pt-1">Connect Privy wallet first.</p>
            )}
            {vincentStatus === "not_configured" && (
              <p className="text-[10px] text-amber-300/50 text-center pt-1">
                Set VINCENT_DELEGATEE_PRIVATE_KEY for Vincent funding.
              </p>
            )}
            {vincentStatus === "needs_connect" && (
              <p className="text-[10px] text-amber-300/50 text-center pt-1">
                Authorize SplitHub in Vincent before JIT funding can run.
              </p>
            )}
            {vincentError && <p className="text-[10px] text-rose-400/80 text-center pt-1">{vincentError}</p>}
            {error && <p className="text-[10px] text-rose-400/80 text-center pt-1">{error}</p>}
            {saveMessage && <p className="text-[10px] text-emerald-400/80 text-center pt-1">{saveMessage}</p>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

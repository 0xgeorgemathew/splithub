"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { ArrowUpRight, Landmark, LoaderCircle, PiggyBank, Radio, Wallet } from "lucide-react";
import { useVincentClosePosition } from "~~/hooks/useVincentClosePosition";
import { useVincentOpenPosition } from "~~/hooks/useVincentOpenPosition";
import { useVincentSession } from "~~/hooks/useVincentSession";
import { useVincentWallets } from "~~/hooks/useVincentWallets";

function formatUsd(value?: string) {
  if (!value) return "--";
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "--";
}

const cardBg: React.CSSProperties = {
  background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
  boxShadow: "0 4px 24px -4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
};

const glow: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(ellipse at 20% 20%, rgba(242,169,0,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(52,211,153,0.06) 0%, transparent 50%)",
};

const ease = { duration: 0.4, ease: "easeOut" as const };
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: ease },
};

function getVincentBadge(status: string) {
  if (status === "authenticated") return { text: "Live", cls: "bg-emerald-500/20 text-emerald-300" };
  if (status === "error" || status === "not_configured")
    return { text: "Offline", cls: "bg-rose-500/20 text-rose-300" };
  return { text: "Idle", cls: "bg-white/10 text-white/50" };
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
  const hasWithdrawableBalance =
    (Number.isFinite(Number.parseFloat(snapshot?.agentAaveWithdrawableUsdc ?? "0")) &&
      Number.parseFloat(snapshot?.agentAaveWithdrawableUsdc ?? "0") > 0) ||
    (Number.isFinite(Number.parseFloat(snapshot?.agentLiquidUsdc ?? "0")) &&
      Number.parseFloat(snapshot?.agentLiquidUsdc ?? "0") > 0);

  const schedulePostActionRefresh = useCallback(() => {
    for (const delay of [1500, 5000]) {
      window.setTimeout(() => void refresh(), delay);
    }
  }, [refresh]);

  const handleOpenPosition = useCallback(async () => {
    if (!walletAddress) return;
    try {
      await openPosition(walletAddress);
      await refresh();
      schedulePostActionRefresh();
    } catch {
      /* hook handles */
    }
  }, [openPosition, refresh, schedulePostActionRefresh, walletAddress]);

  const handleClosePosition = useCallback(async () => {
    if (!walletAddress) return;
    try {
      await closePosition(walletAddress);
      await refresh();
      schedulePostActionRefresh();
    } catch {
      /* hook handles */
    }
  }, [closePosition, refresh, schedulePostActionRefresh, walletAddress]);

  const badge = getVincentBadge(vincentStatus);
  const anyError = vincentError || walletError || openError || closeError;

  return (
    <div className="px-4 pt-[76px] pb-[76px] md:px-6 lg:px-8 max-w-md md:max-w-lg lg:max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl relative overflow-hidden border border-white/[0.06]"
        style={cardBg}
      >
        <div className="absolute inset-0 opacity-50" style={glow} />

        <div className="relative">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center border border-amber-500/10">
                <Landmark className="w-[18px] h-[18px] text-amber-300" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-none">DeFi</h1>
                <p className="text-[11px] text-white/35 mt-0.5">Aave yield via Vincent</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {pkpAddress && (
                <span className="text-[10px] font-mono text-white/20 hidden sm:block">
                  {pkpAddress.slice(0, 6)}...{pkpAddress.slice(-4)}
                </span>
              )}
              <span
                className={`px-2.5 py-[5px] rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}
              >
                {badge.text}
              </span>
            </div>
          </div>

          <div className="h-px bg-white/[0.06] mx-5" />

          {/* ── 2×2 Metric Grid ── */}
          <div className="grid grid-cols-2 gap-px mx-5 mt-4 bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04]">
            {/* Privy */}
            <div className="bg-[#111] px-3.5 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet className="w-3 h-3 text-amber-300/80" />
                <span className="text-[9px] font-bold text-amber-300/70 uppercase tracking-widest">Privy</span>
              </div>
              <p className="text-xl font-bold text-white font-mono tracking-tight leading-none">
                {formatUsd(snapshot?.privyUsdc)}
              </p>
            </div>
            {/* Agent */}
            <div className="bg-[#111] px-3.5 py-3 border-l border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-1">
                <Radio className="w-3 h-3 text-sky-300/80" />
                <span className="text-[9px] font-bold text-sky-300/70 uppercase tracking-widest">Agent</span>
              </div>
              <p className="text-xl font-bold text-white font-mono tracking-tight leading-none">
                {formatUsd(snapshot?.agentLiquidUsdc)}
              </p>
            </div>
            {/* Aave Supplied */}
            <div className="bg-[#111] px-3.5 py-3 border-t border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-1">
                <PiggyBank className="w-3 h-3 text-emerald-400/80" />
                <span className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-widest">Aave</span>
              </div>
              <p className="text-xl font-bold text-white font-mono tracking-tight leading-none">
                {formatUsd(snapshot?.agentAaveSuppliedUsdc)}
              </p>
            </div>
            {/* Withdrawable */}
            <div className="bg-[#111] px-3.5 py-3 border-t border-l border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-1">
                <Landmark className="w-3 h-3 text-rose-300/80" />
                <span className="text-[9px] font-bold text-rose-300/70 uppercase tracking-widest">Withdrawable</span>
              </div>
              <p className="text-xl font-bold text-white font-mono tracking-tight leading-none">
                {formatUsd(snapshot?.agentAaveWithdrawableUsdc)}
              </p>
            </div>
          </div>

          {/* ── Planner / Result ── */}
          {(result || closeResult) && (
            <div className="mx-5 mt-3 px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              {result && (
                <p className="text-[11px] text-white/50 leading-relaxed">
                  <span className="text-amber-300 font-semibold">Plan:</span> {result.plan.reasoning}
                  {result.plan.actions.map((a, i) => (
                    <span key={i} className="block text-[10px] text-white/35 mt-0.5">
                      {a.type === "no_action" ? "No action needed" : `${a.type}: ${a.amount}`}
                    </span>
                  ))}
                </p>
              )}
              {closeResult && (
                <p className="text-[11px] text-white/50 leading-relaxed">
                  <span className="text-emerald-300 font-semibold">Unwound:</span> {formatUsd(closeResult.amount)}{" "}
                  returned to Privy wallet
                </p>
              )}
            </div>
          )}

          <div className="h-px bg-white/[0.06] mx-5 mt-3" />

          {/* ── Actions ── */}
          <div className="px-5 pt-4 pb-5 space-y-2">
            {!authenticated && vincentStatus === "needs_connect" && (
              <button
                type="button"
                onClick={() => connect("/defi")}
                className="btn btn-secondary btn-sm h-10 min-h-0 w-full text-xs"
              >
                Connect Vincent
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenPosition}
              disabled={!walletAddress || !isVincentReady || isOpening || isClosing || !hasDeployableBalance}
              className="btn btn-primary btn-sm h-10 min-h-0 w-full text-xs flex items-center justify-center gap-2"
            >
              {isOpening ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {state === "funding" ? "Funding..." : "Deploying..."}
                </>
              ) : (
                <>
                  <PiggyBank className="h-4 w-4" />
                  Deploy to Aave
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClosePosition}
              disabled={!walletAddress || !isVincentReady || isOpening || isClosing || !hasWithdrawableBalance}
              className="btn btn-outline btn-sm h-10 min-h-0 w-full text-xs"
            >
              {isClosing ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                "Withdraw to Privy"
              )}
            </button>
            <Link
              href="/agents-pay"
              className="btn btn-outline btn-sm h-10 min-h-0 text-xs w-full flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Agents Pay
            </Link>

            {/* Inline warnings */}
            {!walletAddress && (
              <p className="text-[10px] text-amber-300/70 text-center pt-1">Connect Privy wallet first.</p>
            )}
            {vincentStatus === "not_configured" && (
              <p className="text-[10px] text-amber-300/50 text-center pt-1">
                Set VINCENT_DELEGATEE_PRIVATE_KEY for Vincent actions.
              </p>
            )}
            {vincentStatus === "needs_connect" && (
              <p className="text-[10px] text-amber-300/50 text-center pt-1">Authorize SplitHub in Vincent first.</p>
            )}
            {anyError && (
              <p className="text-[10px] text-rose-400/80 text-center pt-1 truncate">
                {vincentError || walletError || openError || closeError}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

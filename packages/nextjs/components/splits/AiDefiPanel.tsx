"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Landmark, Radio, Sparkles, X } from "lucide-react";
import { scalePop, slideUp, staggerContainer, staggerItem } from "~~/components/shared/animations/common.animations";
import type { SplitsDefiPlan, SplitsDefiSnapshot } from "~~/services/splitsDefiPlannerService";

type PanelPhase = "idle" | "scanning" | "thinking" | "results";

interface AiDefiPanelProps {
  loading: boolean;
  data: {
    snapshot: SplitsDefiSnapshot;
    plan: SplitsDefiPlan;
    source: "llm" | "fallback";
    plannedAt: string;
  } | null;
  error: string | null;
  onClose: () => void;
}

const VENUE_COLORS: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  "Aave V3": { color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/40" },
  "Compound V3": { color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/40" },
  Moonwell: { color: "text-violet-400", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/40" },
};

const SCAN_STEPS = ["Reading wallet balances...", "Scanning Base protocols...", "Fetching live yields..."];

function PhaseScanning() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = SCAN_STEPS.map((_, i) => window.setTimeout(() => setStep(i + 1), (i + 1) * 500));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div variants={slideUp} initial="hidden" animate="show" exit="exit" className="text-center py-8">
      <div className="relative inline-flex items-center justify-center mb-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-14 h-14 rounded-full border-2 border-emerald-500/20 border-t-emerald-400"
        />
        <Radio className="w-6 h-6 text-emerald-400 absolute" />
      </div>
      <motion.p
        key={step}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm text-white/50"
      >
        {SCAN_STEPS[Math.min(step, SCAN_STEPS.length - 1)]}
      </motion.p>
    </motion.div>
  );
}

function PhaseThinking() {
  return (
    <motion.div variants={slideUp} initial="hidden" animate="show" exit="exit" className="text-center py-8">
      <div className="inline-flex items-center justify-center mb-4">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"
        >
          <BrainCircuit className="w-7 h-7 text-amber-400" />
        </motion.div>
      </div>
      <p className="text-sm text-white/50">Planning optimal allocation...</p>
      <div className="flex items-center justify-center gap-1 mt-3">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            className="w-1.5 h-1.5 rounded-full bg-amber-400"
          />
        ))}
      </div>
    </motion.div>
  );
}

function PhaseResults({ data }: { data: NonNullable<AiDefiPanelProps["data"]> }) {
  const { snapshot, plan, source } = data;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
      <motion.div variants={staggerItem} className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">AI Allocation</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/40 ml-auto">
          {snapshot.ratesSource === "live" ? "Live Rates" : "Fallback"}
        </span>
        {source === "fallback" && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300/60">LLM Fallback</span>
        )}
      </motion.div>

      <motion.div
        variants={staggerItem}
        className="rounded-xl border border-white/[0.05] overflow-hidden"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
          {snapshot.walletTokens.map(token => (
            <div key={token.symbol} className="bg-[#111] px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Landmark className="w-3 h-3 text-white/40" />
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">{token.symbol}</span>
              </div>
              <p className="text-lg font-bold text-white font-mono tracking-tight leading-none">${token.usdValue}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="space-y-2">
        {plan.allocations.map((alloc, i) => {
          const venueStyle = VENUE_COLORS[alloc.venue] || {
            color: "text-white/60",
            bgColor: "bg-white/5",
            borderColor: "border-white/10",
          };
          return (
            <motion.div
              key={i}
              variants={staggerItem}
              className={`rounded-xl border ${venueStyle.borderColor} ${venueStyle.bgColor} px-3.5 py-3 flex items-center justify-between`}
            >
              <div className="flex items-center gap-2">
                <Landmark className={`w-4 h-4 ${venueStyle.color}`} />
                <div>
                  <p className="text-sm font-semibold text-white">{alloc.venue}</p>
                  <p className="text-[10px] text-white/40">
                    {alloc.amount} {alloc.asset}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${venueStyle.color}`}>{alloc.apyPct}% APY</p>
                <p className="text-[9px] text-white/25">Base</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        variants={staggerItem}
        className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5 text-center"
      >
        <p className="text-[10px] text-amber-300/60 uppercase tracking-wider font-bold mb-0.5">Projected Daily Yield</p>
        <p className="text-xl font-bold text-amber-300 font-mono">${plan.totalProjectedYieldUsd}</p>
      </motion.div>

      <motion.div variants={staggerItem} className="px-1">
        <p className="text-[11px] text-white/35 leading-relaxed">{plan.reasoning}</p>
      </motion.div>

      <motion.div variants={staggerItem} className="flex flex-wrap gap-1.5 px-1">
        {snapshot.candidateVenues
          .filter((v, idx, arr) => arr.findIndex(x => x.label === v.label) === idx)
          .map(venue => {
            const style = VENUE_COLORS[venue.label] || {
              color: "text-white/40",
              bgColor: "bg-white/5",
            };
            return (
              <span
                key={venue.label}
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${style.bgColor} ${style.color}`}
              >
                {venue.label}
              </span>
            );
          })}
      </motion.div>
    </motion.div>
  );
}

export function AiDefiPanel({ loading, data, error, onClose }: AiDefiPanelProps) {
  const timerRef = useRef<number | null>(null);
  const [thinkingElapsed, setThinkingElapsed] = useState(false);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (loading && !data) {
      timerRef.current = window.setTimeout(() => setThinkingElapsed(true), 1500);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, data]);

  const derivedPhase: PanelPhase = useMemo(() => {
    if (error && !loading && !data) return "idle";
    if (data) return "results";
    if (loading && !data && thinkingElapsed) return "thinking";
    if (loading && !data) return "scanning";
    return "idle";
  }, [loading, data, error, thinkingElapsed]);

  if (derivedPhase === "idle" && !loading && !data && !error) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="mb-6 rounded-2xl p-6 relative overflow-hidden border border-white/[0.05]"
      style={{
        background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
        boxShadow: "0 4px 20px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 20%, rgba(242,169,0,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(52,211,153,0.06) 0%, transparent 50%)",
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">AI DeFi Planner</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div key="error" variants={scalePop} initial="hidden" animate="show" exit="exit">
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200/90 text-center">
                {error}
              </div>
            </motion.div>
          )}

          {derivedPhase === "scanning" && <PhaseScanning key="scanning" />}
          {derivedPhase === "thinking" && !data && <PhaseThinking key="thinking" />}
          {derivedPhase === "results" && data && <PhaseResults key="results" data={data} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ArrowRight, Bot, Droplets, Landmark, ShieldCheck, Sparkles, Waves } from "lucide-react";

type StrategyTab = "aave" | "lp";

const strategyTabs: Array<{ id: StrategyTab; label: string }> = [
  { id: "aave", label: "Aave" },
  { id: "lp", label: "Uniswap LP" },
];

const strategyContent: Record<
  StrategyTab,
  {
    eyebrow: string;
    title: string;
    description: string;
    accent: string;
    stats: Array<{ label: string; value: string; hint: string }>;
    bullets: string[];
  }
> = {
  aave: {
    eyebrow: "Idle balance routing",
    title: "Park spare settlement USDC inside Aave until it is needed.",
    description:
      "Reserve cash stays visible for SplitHub, while the rest sits in a yield bucket with a clear withdrawal lane for upcoming payments.",
    accent: "from-primary/20 via-primary/10 to-transparent",
    stats: [
      { label: "Projected APY", value: "4.82%", hint: "UI estimate" },
      { label: "Instant reserve", value: "$420", hint: "Always liquid" },
      { label: "Withdrawal lane", value: "< 1 tap", hint: "Preview only" },
    ],
    bullets: [
      "Maintain a dedicated payment buffer before routing excess balance.",
      "Surface borrow headroom separately so social payments never touch leverage.",
      "Keep inflow and withdrawal history in the same SplitHub rhythm.",
    ],
  },
  lp: {
    eyebrow: "Active fee generation",
    title: "Stage a Uniswap LP sleeve for balances that can tolerate some movement.",
    description:
      "Use a narrower band for fee capture while the app keeps enough dry powder outside the position for quick settlements.",
    accent: "from-success/20 via-success/10 to-transparent",
    stats: [
      { label: "Pool focus", value: "ETH / USDC", hint: "Base-style routing" },
      { label: "Range band", value: "$2.95k - $3.25k", hint: "Editable UI" },
      { label: "Fee target", value: "$28/day", hint: "Scenario output" },
    ],
    bullets: [
      "Model how much capital stays inside the active band versus the reserve wallet.",
      "Highlight fee income next to drift risk instead of hiding it in analytics.",
      "Show when the agent would unwind part of the LP before approving a payment.",
    ],
  },
};

const portfolioSlices = [
  {
    label: "Settlement Buffer",
    value: "$420",
    detail: "Ready for instant friend payouts",
    tone: "border-primary/20 bg-primary/10 text-primary",
  },
  {
    label: "Aave Earn Sleeve",
    value: "$1,280",
    detail: "Low-friction idle cash parking",
    tone: "border-info/20 bg-info/10 text-info",
  },
  {
    label: "Uniswap LP Sleeve",
    value: "$860",
    detail: "Fee-first but settlement-aware",
    tone: "border-success/20 bg-success/10 text-success",
  },
];

const automationRules = [
  {
    title: "Keep cash ahead of payments",
    description: "Hold a protected reserve so the next request does not force a full unwind.",
    icon: ShieldCheck,
  },
  {
    title: "Move idle funds with intent",
    description: "Route surplus into the highest-priority strategy sleeve instead of leaving it dormant.",
    icon: Landmark,
  },
  {
    title: "Surface risk before yield",
    description: "LP drift, buffer depletion, and withdrawal pressure stay visible in the same dashboard.",
    icon: Activity,
  },
];

export default function DefiPage() {
  const [activeTab, setActiveTab] = useState<StrategyTab>("aave");
  const activeStrategy = strategyContent[activeTab];

  return (
    <div className="px-4 py-4 pb-24 md:px-6 lg:px-8 max-w-md md:max-w-lg lg:max-w-xl mx-auto">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[32px] border border-primary/20 bg-gradient-to-br from-base-200/90 via-base-200/70 to-base-300/40 p-6 shadow-[0_24px_64px_-36px_rgba(0,0,0,0.55)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(242,169,0,0.18),transparent_42%)]" />
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              UI Preview
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-base-content/10 bg-base-100/60 px-3 py-1 text-xs font-medium text-base-content/60">
              <Landmark className="h-3.5 w-3.5 text-primary" />
              Aave
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-base-content/10 bg-base-100/60 px-3 py-1 text-xs font-medium text-base-content/60">
              <Waves className="h-3.5 w-3.5 text-success" />
              Uniswap LP
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="font-[family-name:var(--font-archivo)] text-4xl font-bold tracking-tight text-base-content">
              DeFi that stays in sync with <span className="text-primary">SplitHub</span>
            </h1>
            <p className="max-w-xl font-[family-name:var(--font-outfit)] text-sm leading-6 text-base-content/65 sm:text-base">
              A UI-only treasury view for users who want split settlements backed by yield positions instead of idle
              cash. No blockchain integration is active on this screen.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {portfolioSlices.map(slice => (
              <div
                key={slice.label}
                className="rounded-2xl border border-white/8 bg-base-100/70 p-4 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">
                  {slice.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-base-content">{slice.value}</p>
                <span
                  className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${slice.tone}`}
                >
                  {slice.detail}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/agents-pay"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-content shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
            >
              Open Agents Pay
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-base-content/10 bg-base-100/60 px-4 py-3 text-sm text-base-content/60">
              <Bot className="h-4 w-4 text-base-content/50" />
              Strategy controls are visual only for now
            </span>
          </div>
        </div>
      </motion.section>

      <section className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/40">Strategy Desk</p>
            <h2 className="mt-1 font-[family-name:var(--font-archivo)] text-2xl font-bold text-base-content">
              Choose the balance sleeve
            </h2>
          </div>

          <div className="rounded-full border border-base-content/10 bg-base-100/80 p-1">
            {strategyTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-primary-content shadow-md"
                      : "text-base-content/55 hover:text-base-content"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden rounded-[28px] border border-base-content/10 bg-base-100/85 shadow-[0_20px_54px_-38px_rgba(0,0,0,0.65)]"
        >
          <div className={`bg-gradient-to-r ${activeStrategy.accent} p-5`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">
              {activeStrategy.eyebrow}
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-archivo)] text-2xl font-bold text-base-content">
              {activeStrategy.title}
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-base-content/65">{activeStrategy.description}</p>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {activeStrategy.stats.map(stat => (
              <div key={stat.label} className="rounded-2xl border border-base-content/8 bg-base-200/60 p-4">
                <p className="text-xs font-medium text-base-content/45">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold text-base-content">{stat.value}</p>
                <p className="mt-1 text-xs text-base-content/45">{stat.hint}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-base-content/8 px-5 py-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
              <Droplets className="h-4 w-4 text-primary" />
              What this view is optimizing for
            </div>
            <div className="mt-4 space-y-3">
              {activeStrategy.bullets.map(item => (
                <div key={item} className="flex gap-3 rounded-2xl border border-base-content/8 bg-base-200/40 p-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm leading-6 text-base-content/65">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mt-6 grid gap-4">
        {automationRules.map((rule, index) => {
          const Icon = rule.icon;
          return (
            <motion.div
              key={rule.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index, duration: 0.35 }}
              className="rounded-[26px] border border-base-content/10 bg-gradient-to-br from-base-100/85 to-base-200/55 p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-archivo)] text-xl font-bold text-base-content">
                    {rule.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-base-content/62">{rule.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, CheckCircle2, LoaderCircle, Nfc, Shield, Waves } from "lucide-react";

type MockPaymentState = "ready" | "routing" | "paid";

const planSteps = [
  {
    title: "User taps to pay",
    ready: "Waiting for the NFC payment action.",
    routing: "NFC payment received and agent started the route.",
    paid: "Tap flow completed.",
  },
  {
    title: "Agent pulls from DeFi",
    ready: "Reserve is short, so the agent already selected Aave for the top-up.",
    routing: "Agent is pulling the shortfall from Aave and leaving LP untouched.",
    paid: "DeFi top-up completed.",
  },
  {
    title: "Payment settles",
    ready: "Settlement will complete automatically after the tap.",
    routing: "Payment is being finalized.",
    paid: "Mock payment settled successfully.",
  },
] as const;

export default function AgentsPayPage() {
  const [paymentState, setPaymentState] = useState<MockPaymentState>("ready");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMockPayment = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    setPaymentState("routing");
    timeoutRef.current = window.setTimeout(() => {
      setPaymentState("paid");
      timeoutRef.current = null;
    }, 1800);
  };

  const handleReset = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPaymentState("ready");
  };

  return (
    <div className="px-4 py-4 pb-24 md:px-6 lg:px-8 max-w-md md:max-w-lg lg:max-w-xl mx-auto">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[32px] border border-primary/20 bg-gradient-to-br from-base-200/90 via-base-200/65 to-base-300/40 p-6 shadow-[0_24px_64px_-36px_rgba(0,0,0,0.55)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_40%)]" />
        <div className="absolute -right-10 bottom-0 h-44 w-44 rounded-full bg-info/10 blur-3xl" />

        <div className="relative space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              <Bot className="h-3.5 w-3.5" />
              Agent Ready
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-base-content/10 bg-base-100/60 px-3 py-1 text-xs font-medium text-base-content/60">
              <Shield className="h-3.5 w-3.5 text-success" />
              UI Only
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="font-[family-name:var(--font-archivo)] text-4xl font-bold tracking-tight text-base-content">
              Agents Pay
            </h1>
            <p className="max-w-xl font-[family-name:var(--font-outfit)] text-sm leading-6 text-base-content/65 sm:text-base">
              User taps to pay with NFC. The agent already knows the route, pulls the shortfall from DeFi, and completes
              the payment.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-base-100/70 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">Payment</p>
              <p className="mt-2 text-2xl font-bold text-base-content">$86.00</p>
              <p className="mt-2 text-xs text-base-content/45">SplitHub Cafe</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-base-100/70 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">Agent route</p>
              <p className="mt-2 text-2xl font-bold text-base-content">Aave top-up</p>
              <p className="mt-2 text-xs text-base-content/45">Use reserve first, then pull the shortfall</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-base-100/70 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">LP sleeve</p>
              <p className="mt-2 text-2xl font-bold text-base-content">Untouched</p>
              <p className="mt-2 text-xs text-base-content/45">No LP unwind for this payment</p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
        className="mt-6 rounded-[28px] border border-base-content/10 bg-base-100/85 p-5 shadow-[0_20px_54px_-38px_rgba(0,0,0,0.65)]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Nfc className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/40">Mock Flow</p>
            <h2 className="font-[family-name:var(--font-archivo)] text-2xl font-bold text-base-content">
              One tap, one agent plan
            </h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-base-content/8 bg-base-200/40 p-4">
            <p className="text-xs text-base-content/45">Reserve used</p>
            <p className="mt-2 text-2xl font-bold text-base-content">$32</p>
          </div>
          <div className="rounded-2xl border border-base-content/8 bg-base-200/40 p-4">
            <p className="text-xs text-base-content/45">DeFi pulled</p>
            <p className="mt-2 text-2xl font-bold text-base-content">$54</p>
          </div>
          <div className="rounded-2xl border border-base-content/8 bg-base-200/40 p-4">
            <p className="text-xs text-base-content/45">Status</p>
            <p className="mt-2 text-2xl font-bold text-base-content">
              {paymentState === "ready" ? "Ready" : paymentState === "routing" ? "Paying" : "Paid"}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {planSteps.map((step, index) => {
            const description =
              paymentState === "ready" ? step.ready : paymentState === "routing" ? step.routing : step.paid;
            const isDone = paymentState === "paid";
            const isActive = paymentState !== "paid" && (paymentState === "ready" ? index === 0 : index < 2);

            return (
              <div
                key={step.title}
                className={`flex gap-3 rounded-2xl border p-4 ${
                  isDone
                    ? "border-success/20 bg-success/10"
                    : isActive
                      ? "border-primary/20 bg-primary/10"
                      : "border-base-content/8 bg-base-200/30"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    isDone
                      ? "border-success/30 bg-success/15 text-success"
                      : isActive
                        ? "border-primary/30 bg-primary/15 text-primary"
                        : "border-base-content/10 bg-base-200 text-base-content/40"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isActive && paymentState === "routing" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-base-content">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-base-content/60">{description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={handleMockPayment}
          disabled={paymentState === "routing"}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-4 text-sm font-semibold text-primary-content shadow-lg shadow-primary/20 transition-all disabled:cursor-not-allowed disabled:opacity-70"
        >
          {paymentState === "routing" ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Processing mock NFC payment
            </>
          ) : (
            <>
              <Nfc className="h-4 w-4" />
              {paymentState === "paid" ? "Run mock NFC payment again" : "Mock NFC Pay"}
            </>
          )}
        </motion.button>

        <button
          type="button"
          onClick={handleReset}
          className="mt-3 w-full rounded-full border border-base-content/10 bg-base-100/70 px-5 py-3 text-sm font-semibold text-base-content/70 transition-colors hover:text-base-content"
        >
          Reset
        </button>

        <div className="mt-5 rounded-2xl border border-base-content/8 bg-base-200/30 p-4">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-info" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/40">Agent note</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-base-content/62">
            {paymentState === "ready"
              ? "The route is already decided before the tap."
              : paymentState === "routing"
                ? "The agent is pulling from DeFi and settling the payment."
                : "The mock payment is complete and the next rebalance can happen later."}
          </p>
        </div>
      </motion.section>
    </div>
  );
}

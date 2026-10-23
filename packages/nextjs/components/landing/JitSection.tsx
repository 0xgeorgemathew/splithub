"use client";

import { motion } from "framer-motion";

// These happen in order on every tap, so the numbering is meaningful
const steps = [
  {
    title: "Check readiness",
    body: "SplitHub compares the payment against your wallet, your agent wallet, and your Aave reserve, within the tap limit you set.",
    figure: "$3.20 on hand · $18.50 due",
  },
  {
    title: "Fund just in time",
    body: "If the wallet is short, your agent withdraws only the difference from Aave. Everything else keeps earning.",
    figure: "$15.30 from Aave",
  },
  {
    title: "Sign and settle",
    body: "Your chip signs the payment and it settles in USDC on Base. No relayer in between, and no price swings.",
    figure: "$18.50 paid",
  },
];

export function JitSection() {
  return (
    <section className="px-5 sm:px-8 py-20 sm:py-28 bg-base-200/50 border-y border-base-content/5">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="lg:sticky lg:top-32 self-start"
        >
          <p className="m-0 mb-5 font-jetbrains text-[11px] uppercase tracking-[0.22em] text-primary">Agent Pay</p>
          <h2 className="font-wide text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-[-0.02em] leading-[0.95] m-0">
            Idle balance is the price of being ready to pay.
          </h2>
          <p className="font-[family-name:var(--font-outfit)] mt-6 mb-0 max-w-md text-base sm:text-lg text-base-content/60 font-light leading-relaxed">
            Most tap-to-pay setups ask you to preload a balance and leave it there. SplitHub keeps your money in Aave
            and moves it the moment a payment needs it.
          </p>
        </motion.div>

        <ol className="m-0 p-0 list-none">
          {steps.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative grid grid-cols-[2.5rem_1fr] gap-x-5 pb-12 last:pb-0"
            >
              {/* Connector between steps */}
              {i < steps.length - 1 && (
                <span aria-hidden className="absolute left-[1.25rem] top-11 bottom-1 w-px bg-base-content/15" />
              )}

              <span className="relative font-jetbrains text-sm font-medium w-10 h-10 rounded-full border border-primary/40 text-primary flex items-center justify-center bg-base-100">
                {i + 1}
              </span>

              <div className="pt-1.5">
                <h3 className="font-[family-name:var(--font-archivo)] text-xl sm:text-2xl font-bold m-0">
                  {step.title}
                </h3>
                <p className="font-[family-name:var(--font-outfit)] mt-3 mb-0 text-base-content/60 font-light leading-relaxed max-w-lg">
                  {step.body}
                </p>
                <p className="m-0 mt-4 inline-block font-jetbrains text-xs text-base-content/70 px-2.5 py-1 rounded-md bg-base-100 border border-base-content/10 tabular-nums">
                  {step.figure}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

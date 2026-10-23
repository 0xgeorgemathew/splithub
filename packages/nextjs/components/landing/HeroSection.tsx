"use client";

import Link from "next/link";
import { TapReceipt } from "./TapReceipt";
import { type Variants, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export function HeroSection() {
  return (
    <section className="relative px-5 sm:px-8 pt-28 sm:pt-32 pb-8 sm:pb-20 lg:min-h-screen flex items-center">
      {/* Faint grid, like the face of a card reader */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_70%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-14 lg:gap-10 items-center">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.p
            variants={rise}
            className="m-0 mb-6 font-jetbrains text-[11px] sm:text-xs uppercase tracking-[0.22em] text-base-content/50"
          >
            NFC tap-to-pay · USDC on Base
          </motion.p>

          <motion.h1
            variants={rise}
            className="font-wide text-[2.6rem] leading-[0.95] sm:text-6xl lg:text-[4.5rem] font-extrabold tracking-[-0.02em] uppercase"
          >
            Tap to pay.
            <br />
            <span className="text-primary">Straight from</span>
            <br />
            <span className="text-primary">your wallet.</span>
          </motion.h1>

          <motion.p
            variants={rise}
            className="font-[family-name:var(--font-outfit)] mt-7 mb-0 max-w-[30rem] text-base sm:text-lg leading-relaxed text-base-content/65 font-light"
          >
            Your chip signs the payment and the USDC moves directly from your wallet to the store, stall, or friend. No
            balance parked on the card, no relayer in between.
          </motion.p>

          <motion.div variants={rise} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/register"
              className="font-[family-name:var(--font-archivo)] h-12 px-7 inline-flex items-center gap-2 rounded-full bg-primary text-primary-content font-bold text-[15px] transition-[transform,background-color] duration-200 hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Create account
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/store"
              className="font-[family-name:var(--font-archivo)] h-12 inline-flex items-center gap-2 font-semibold text-[15px] text-base-content/70 hover:text-base-content underline decoration-base-content/25 underline-offset-[6px] hover:decoration-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary rounded"
            >
              Browse stores
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <TapReceipt />
        </motion.div>
      </div>
    </section>
  );
}

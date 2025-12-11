"use client";

import Link from "next/link";
import { PhoneMockup } from "./PhoneMockup";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const textReveal = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function HeroSection() {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-8 sm:py-12 overflow-hidden">
      {/* Staggered headline reveal */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="text-center mb-8 sm:mb-10">
        <motion.h1
          variants={textReveal}
          className="font-[family-name:var(--font-archivo)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4"
        >
          <span className="inline-block">Tap-to-Pay.</span> <span className="inline-block text-primary">On-Chain.</span>{" "}
          <span className="inline-block">Instant.</span>
        </motion.h1>

        <motion.p
          variants={textReveal}
          className="font-[family-name:var(--font-outfit)] text-base-content/60 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-light"
        >
          Spend stablecoins in the real world
          <br className="hidden sm:block" /> with the speed and secuity of a credit card.
        </motion.p>
      </motion.div>

      {/* Phone Mockup Animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="mb-8 sm:mb-10 w-full flex justify-center"
      >
        <PhoneMockup />
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="flex flex-col sm:flex-row items-center gap-4"
      >
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <Link
            href="/register"
            className="font-[family-name:var(--font-archivo)] h-12 px-8 text-base font-bold bg-primary text-primary-content hover:bg-primary/90 rounded-full transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              boxShadow: "0 4px 14px rgba(242, 169, 0, 0.4), inset 0 1px 1px rgba(255,255,255,0.2)",
            }}
          >
            Get Started in Seconds
          </Link>
        </motion.div>

        <button
          onClick={scrollToFeatures}
          className="flex items-center gap-2 text-base-content/60 hover:text-base-content transition-colors duration-200 group"
        >
          <span>Learn More</span>
          <ChevronDown className="w-4 h-4 animate-bounce group-hover:text-primary transition-colors" />
        </button>
      </motion.div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="font-[family-name:var(--font-outfit)] mt-8 sm:mt-12 flex items-center gap-6 text-xs text-base-content/40"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span>Gasless Transactions</span>
        </div>
        <div className="hidden sm:block w-px h-4 bg-base-content/20" />
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-jetbrains)]">USDC</span>
          <span>Powered</span>
        </div>
        <div className="hidden sm:block w-px h-4 bg-base-content/20" />
        <div className="hidden sm:flex items-center gap-2">
          <span>Base Network</span>
        </div>
      </motion.div>
    </section>
  );
}

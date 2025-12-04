"use client";

import Link from "next/link";
import { DualHeroAnimation } from "./DualHeroAnimation";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export function HeroSection() {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="min-h-[calc(100vh-160px)] flex flex-col items-center justify-center px-4 py-12">
      {/* Tagline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="font-[family-name:var(--font-bricolage)] text-4xl sm:text-5xl md:text-6xl font-bold text-center mb-4 tracking-tight"
      >
        One Tap. Every Payment.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-base-content/60 text-lg sm:text-xl text-center max-w-lg mb-10"
      >
        Split bills with friends. Load credits at venues.
        <br />
        Settle instantly.
      </motion.p>

      {/* Dual Animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-10 w-full max-w-2xl"
      >
        <DualHeroAnimation />
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-4"
      >
        <Link
          href="/register"
          className="h-12 px-8 text-base font-bold bg-primary text-primary-content hover:bg-primary/90 rounded-full transition-all duration-200 flex items-center justify-center"
          style={{
            boxShadow: "0 4px 14px rgba(242, 169, 0, 0.4), inset 0 1px 1px rgba(255,255,255,0.2)",
          }}
        >
          Get Started
        </Link>

        <button
          onClick={scrollToFeatures}
          className="flex items-center gap-2 text-base-content/60 hover:text-base-content transition-colors duration-200"
        >
          <span>Learn More</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </button>
      </motion.div>
    </section>
  );
}

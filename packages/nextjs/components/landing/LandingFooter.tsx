"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function LandingFooter() {
  const scrollToHowItWorks = () => {
    document.querySelector("section.bg-base-200\\/50")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="py-12 px-4 border-t border-base-300/30">
      <div className="max-w-2xl mx-auto">
        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="font-[family-name:var(--font-bricolage)] text-2xl sm:text-3xl font-bold mb-4">
            Ready to simplify payments?
          </h2>
          <p className="text-base-content/60 text-sm mb-6">
            Split bills with friends or power your venue with tap-to-pay credits.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 px-8 text-base font-bold bg-primary text-primary-content hover:bg-primary/90 rounded-full transition-all duration-200 items-center justify-center"
              style={{
                boxShadow: "0 4px 14px rgba(242, 169, 0, 0.4), inset 0 1px 1px rgba(255,255,255,0.2)",
              }}
            >
              Get Started Free
            </Link>
            <button
              onClick={scrollToHowItWorks}
              className="inline-flex h-10 px-6 text-sm font-medium text-base-content/70 hover:text-base-content border border-base-300 hover:border-base-content/30 rounded-full transition-all duration-200 items-center justify-center"
            >
              See How It Works
            </button>
          </div>
        </motion.div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-base-300/30">
          {/* Logo */}
          <div
            className="flex items-center h-9 rounded-full overflow-hidden"
            style={{
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            <span className="bg-base-300 text-white h-full flex items-center font-bold text-sm tracking-tight px-3">
              Split
            </span>
            <span className="bg-primary text-primary-content h-full flex items-center font-bold text-sm tracking-tight px-3">
              hub
            </span>
          </div>

          {/* Powered by */}
          <div className="flex items-center gap-2 text-base-content/40 text-xs">
            <span>Powered by</span>
            <span className="font-[family-name:var(--font-jetbrains)] font-medium text-base-content/60">Base</span>
          </div>

          {/* Copyright */}
          <p className="text-base-content/40 text-xs">© {new Date().getFullYear()} SplitHub</p>
        </div>
      </div>
    </footer>
  );
}

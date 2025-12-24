"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Nfc } from "lucide-react";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

export function LandingFooter() {
  return (
    <footer className="py-20 sm:py-28 px-4 border-t border-base-300/20 bg-gradient-to-b from-base-200/50 to-base-100">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="max-w-4xl mx-auto"
      >
        {/* CTA Section */}
        <motion.div variants={fadeUp} className="text-center mb-16">
          {/* Animated NFC icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              <Nfc className="w-8 h-8 text-primary" />
            </motion.div>
          </motion.div>

          <h2 className="font-[family-name:var(--font-archivo)] text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Ready to tap?
          </h2>
          <p className="font-[family-name:var(--font-outfit)] text-base-content/50 text-base sm:text-lg mb-8 max-w-md mx-auto font-light">
            Get started in seconds with your existing social login.
            <br />
            No seed phrases. No wallet setup. Just tap and pay.
          </p>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="inline-block">
            <Link
              href="/register"
              className="font-[family-name:var(--font-archivo)] inline-flex items-center gap-3 h-14 px-10 text-lg font-bold bg-primary text-primary-content hover:bg-primary/90 rounded-full transition-colors duration-200"
              style={{
                boxShadow: "0 6px 20px rgba(242, 169, 0, 0.4), inset 0 1px 1px rgba(255,255,255,0.2)",
              }}
            >
              <span>Get Started in Seconds</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>

          {/* Trust indicator */}
          <motion.p
            variants={fadeUp}
            className="font-[family-name:var(--font-outfit)] mt-6 text-xs text-base-content/40"
          >
            Web2 login powered by Privy
          </motion.p>
        </motion.div>

        {/* Bottom bar */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-base-300/20"
        >
          {/* Logo */}
          <motion.div whileHover={{ scale: 1.05 }}>
            <span className="text-2xl font-black tracking-tight">
              Split<span className="text-primary">Hub</span>
            </span>
          </motion.div>

          {/* Powered by */}
          <div className="font-[family-name:var(--font-outfit)] flex items-center gap-3 text-base-content/40 text-xs">
            <span>Powered by</span>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-jetbrains)] font-medium text-base-content/60">Base</span>
              <span className="text-base-content/20">|</span>
              <span className="font-medium text-base-content/60">Privy</span>
              <span className="text-base-content/20">|</span>
              <span className="font-medium text-base-content/60">Arx</span>
            </div>
          </div>

          {/* Copyright */}
          <p className="font-[family-name:var(--font-outfit)] text-base-content/40 text-xs">
            © {new Date().getFullYear()} SplitHub
          </p>
        </motion.div>
      </motion.div>
    </footer>
  );
}

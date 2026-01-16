"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, type LucideIcon, Network, Shield, Zap } from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function StepSection({
  number,
  title,
  description,
  icon: Icon,
  variant = "left",
}: {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  variant?: "left" | "right";
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={variant === "left" ? slideInLeft : slideInRight}
      className={`flex gap-6 md:gap-8 items-start ${variant === "right" ? "md:flex-row-reverse" : ""}`}
      aria-labelledby={`step-${number}-title`}
    >
      {/* Number */}
      <div
        className="font-[family-name:var(--font-archivo)] text-7xl md:text-8xl font-bold text-white/5 leading-none shrink-0"
        aria-hidden="true"
      >
        {number}
      </div>

      {/* Content */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-white/5" aria-hidden="true">
            <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
          <h3
            id={`step-${number}-title`}
            className="font-[family-name:var(--font-archivo)] text-2xl md:text-3xl font-bold text-white"
          >
            {title}
          </h3>
        </div>
        <p className="font-[family-name:var(--font-outfit)] text-base-content/70 text-lg md:text-xl max-w-md leading-relaxed">
          {description}
        </p>
      </div>
    </motion.section>
  );
}

export default function AboutPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Hero */}
      <header className="min-h-[70vh] flex flex-col items-center justify-center px-4 relative">
        {/* Animated background gradient */}
        <motion.div style={{ y, opacity }} className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.15,
              },
            },
          }}
          className="text-center relative z-10"
        >
          <motion.h1
            variants={fadeInUp}
            className="font-[family-name:var(--font-archivo)] text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white mb-6"
          >
            HOW IT
            <span className="block text-primary">WORKS</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="font-[family-name:var(--font-outfit)] text-base-content/70 text-lg md:text-xl max-w-xl mx-auto font-light"
          >
            Tap-to-pay bill splitting. Powered by NFC. Secured by blockchain.
          </motion.p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
          role="presentation"
          aria-label="Scroll down for more content"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 rounded-full border-2 border-white/10 flex justify-center pt-2"
          >
            <div className="w-1 h-2 rounded-full bg-white/30" />
          </motion.div>
        </motion.div>
      </header>

      {/* Steps */}
      <main>
        <section className="py-24 md:py-32 px-4 md:px-8 max-w-4xl mx-auto" aria-labelledby="steps-heading">
          <h2 id="steps-heading" className="sr-only">
            How It Works Steps
          </h2>
          <div className="space-y-20 md:space-y-28">
            <StepSection
              number="01"
              title="Tap"
              description="Your NFC Halo Chip signs the payment. No apps to open, no QR codes to scan. Just tap and go."
              icon={Zap}
              variant="left"
            />

            <StepSection
              number="02"
              title="Split"
              description="Bills are divided instantly among friends. Add participants, set amounts, and let the math handle itself."
              icon={Network}
              variant="right"
            />

            <StepSection
              number="03"
              title="Done"
              description="Relayer pays the gas. Blockchain settles the rest. You don't spend a cent on transaction fees."
              icon={Shield}
              variant="left"
            />
          </div>
        </section>

        {/* Tech Stack */}
        <section className="py-20 border-t border-white/5" aria-labelledby="tech-heading">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <h2
              id="tech-heading"
              className="font-[family-name:var(--font-outfit)] text-sm text-base-content/70 uppercase tracking-widest"
            >
              Built with
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            className="flex flex-wrap justify-center gap-4 md:gap-6 px-4"
          >
            {[
              { name: "EIP-712", desc: "Typed signing" },
              { name: "Base", desc: "L2 network" },
              { name: "USDC", desc: "Stablecoin" },
              { name: "HaLo", desc: "NFC chips" },
            ].map(tech => (
              <motion.article
                key={tech.name}
                variants={scaleIn}
                className="group relative px-6 py-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-primary/30 focus-within:border-primary/30 transition-colors"
                aria-label={`${tech.name}: ${tech.desc}`}
              >
                <div className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-white mb-1">
                  {tech.name}
                </div>
                <div className="font-[family-name:var(--font-outfit)] text-xs text-base-content/60">{tech.desc}</div>
                <motion.div
                  className="absolute inset-0 bg-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  initial={false}
                />
              </motion.article>
            ))}
          </motion.div>
        </section>

        {/* CTA */}
        <section className="py-24 md:py-32 px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="font-[family-name:var(--font-archivo)] text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to split?
            </h2>
            <p className="font-[family-name:var(--font-outfit)] text-base-content/70 text-lg mb-10">
              Get your NFC chip and start splitting bills gas-free.
            </p>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} whileFocus={{ scale: 1.02 }}>
              <Link
                href="/register"
                className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-[#1b1b1b] rounded-full font-[family-name:var(--font-archivo)] text-lg font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#0a0a0a] shadow-[0_4px_20px_rgba(242,169,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]"
              >
                Start Splitting
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* Minimal footer */}
      <footer role="contentinfo" className="py-8 border-t border-white/5">
        <div className="text-center font-[family-name:var(--font-outfit)] text-sm text-base-content/50">
          SplitHub · Tap-to-pay on-chain
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CreditCard, Nfc, Smartphone, Users, Wallet } from "lucide-react";

interface CardHoverState {
  friends: boolean;
  venues: boolean;
}

export function UseCaseCards() {
  const [hovered, setHovered] = useState<CardHoverState>({
    friends: false,
    venues: false,
  });

  return (
    <section id="features" className="py-16 sm:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="font-[family-name:var(--font-outfit)] inline-block text-xs font-semibold text-primary uppercase tracking-widest mb-3 px-3 py-1 bg-primary/10 rounded-full"
          >
            Two Ways to Pay
          </motion.span>
          <h2 className="font-[family-name:var(--font-archivo)] text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            The Tap is the New Transaction
          </h2>
          <p className="font-[family-name:var(--font-outfit)] text-base-content/50 text-lg max-w-xl mx-auto font-light">
            Whether you&apos;re splitting dinner or spending at events, one tap handles it all.
          </p>
        </motion.div>

        {/* Two Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Social Settlements Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onHoverStart={() => setHovered(h => ({ ...h, friends: true }))}
            onHoverEnd={() => setHovered(h => ({ ...h, friends: false }))}
            className="group relative"
          >
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="relative h-full bg-gradient-to-br from-base-200/80 to-base-200/40 rounded-3xl p-8 border border-primary/20 overflow-hidden"
              style={{
                boxShadow: hovered.friends
                  ? "0 20px 40px -12px rgba(242, 169, 0, 0.25)"
                  : "0 10px 30px -10px rgba(0, 0, 0, 0.2)",
              }}
            >
              {/* Background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Icon */}
              <div className="relative mb-6">
                <motion.div
                  animate={hovered.friends ? { scale: 1.05 } : { scale: 1 }}
                  className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"
                >
                  <Users className="w-7 h-7 text-primary" />
                </motion.div>
              </div>

              {/* Content */}
              <div className="relative">
                <h3 className="font-[family-name:var(--font-archivo)] text-2xl font-bold mb-3">Social Settlements</h3>
                <p className="font-[family-name:var(--font-outfit)] text-base-content/60 mb-6 leading-relaxed font-light">
                  Split bills with friends like a Web3 Splitwise. Track who owes what, then settle with a single tap, no
                  Venmo requests, no IOUs.
                </p>

                {/* Features list */}
                <ul className="space-y-3 mb-8">
                  {["Track group expenses", "See balances at a glance", "Instant settlements"].map((feature, i) => (
                    <li
                      key={i}
                      className="font-[family-name:var(--font-outfit)] flex items-center gap-3 text-sm text-base-content/70"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Hover Animation - Two phones settling */}
                <div className="relative h-24 mb-6 overflow-hidden">
                  <motion.div
                    animate={hovered.friends ? { x: [0, 40], opacity: 1 } : { x: 0, opacity: 0.5 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute left-8 top-1/2 -translate-y-1/2"
                  >
                    <div className="w-10 h-16 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-base-content/40" />
                    </div>
                  </motion.div>

                  <motion.div
                    animate={hovered.friends ? { x: [0, -40], opacity: 1 } : { x: 0, opacity: 0.5 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute right-8 top-1/2 -translate-y-1/2"
                  >
                    <div className="w-10 h-16 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-base-content/40" />
                    </div>
                  </motion.div>

                  {/* Settlement glow on hover */}
                  <motion.div
                    animate={hovered.friends ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/30 blur-md" />
                    <motion.div
                      animate={hovered.friends ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                      transition={{ duration: 0.5, repeat: hovered.friends ? Infinity : 0, repeatDelay: 0.5 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Nfc className="w-6 h-6 text-primary" />
                    </motion.div>
                  </motion.div>
                </div>

                {/* CTA */}
                <Link
                  href="/splits"
                  className="font-[family-name:var(--font-archivo)] inline-flex items-center gap-2 text-primary font-semibold group/link"
                >
                  <span>View Splits</span>
                  <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </motion.div>

          {/* Venues & Event Credits Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onHoverStart={() => setHovered(h => ({ ...h, venues: true }))}
            onHoverEnd={() => setHovered(h => ({ ...h, venues: false }))}
            className="group relative"
          >
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="relative h-full bg-gradient-to-br from-base-200/80 to-base-200/40 rounded-3xl p-8 border border-success/20 overflow-hidden"
              style={{
                boxShadow: hovered.venues
                  ? "0 20px 40px -12px rgba(34, 197, 94, 0.25)"
                  : "0 10px 30px -10px rgba(0, 0, 0, 0.2)",
              }}
            >
              {/* Background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-success/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Icon */}
              <div className="relative mb-6">
                <motion.div
                  animate={hovered.venues ? { scale: 1.05 } : { scale: 1 }}
                  className="w-14 h-14 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center"
                >
                  <CreditCard className="w-7 h-7 text-success" />
                </motion.div>
              </div>

              {/* Content */}
              <div className="relative">
                <h3 className="font-[family-name:var(--font-archivo)] text-2xl font-bold mb-3">
                  Venues & Event Credits
                </h3>
                <p className="font-[family-name:var(--font-outfit)] text-base-content/60 mb-6 leading-relaxed font-light">
                  Load USDC onto your wristband and tap to pay at any activity. Perfect for concerts, arcades, and
                  cashless venues.
                </p>

                {/* Features list */}
                <ul className="space-y-3 mb-8">
                  {["Buy credits with USDC", "Tap wristband to spend", "Real-time balance updates"].map(
                    (feature, i) => (
                      <li
                        key={i}
                        className="font-[family-name:var(--font-outfit)] flex items-center gap-3 text-sm text-base-content/70"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-success" />
                        {feature}
                      </li>
                    ),
                  )}
                </ul>

                {/* Hover Animation - Wristband tapping terminal */}
                <div className="relative h-24 mb-6">
                  {/* Wristband on left */}
                  <motion.div
                    animate={hovered.venues ? { x: [0, 40], opacity: 1 } : { x: 0, opacity: 0.5 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute left-8 top-1/2 -translate-y-1/2"
                  >
                    <div className="w-14 h-8 rounded-full border-3 border-success bg-success/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-success">75</span>
                    </div>
                  </motion.div>

                  {/* Terminal on right */}
                  <motion.div
                    animate={hovered.venues ? { x: [0, -40], opacity: 1 } : { x: 0, opacity: 0.5 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute right-8 top-1/2 -translate-y-1/2"
                  >
                    <div className="w-10 h-16 bg-base-300 rounded-lg border border-base-content/10 flex flex-col items-center justify-center gap-1">
                      <div className="w-6 h-4 bg-base-100 rounded border border-base-content/10" />
                      <Wallet className="w-4 h-4 text-base-content/40" />
                    </div>
                  </motion.div>

                  {/* NFC glow on hover */}
                  <motion.div
                    animate={hovered.venues ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  >
                    <div className="w-12 h-12 rounded-full bg-success/30 blur-md" />
                    <motion.div
                      animate={hovered.venues ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                      transition={{ duration: 0.5, repeat: hovered.venues ? Infinity : 0, repeatDelay: 0.5 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Nfc className="w-6 h-6 text-success" />
                    </motion.div>
                  </motion.div>

                  {/* Credit deduction animation */}
                  <motion.div
                    animate={hovered.venues ? { opacity: [0, 1, 0], y: [0, -20] } : { opacity: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, repeat: hovered.venues ? Infinity : 0, repeatDelay: 0.4 }}
                    className="absolute left-1/2 -translate-x-1/2 top-0 text-success font-bold text-sm"
                  >
                    -10
                  </motion.div>
                </div>

                {/* CTA */}
                <Link
                  href="/credits"
                  className="font-[family-name:var(--font-archivo)] inline-flex items-center gap-2 text-success font-semibold group/link"
                >
                  <span>Buy Credits</span>
                  <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

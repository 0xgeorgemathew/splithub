"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Coins, Fuel, Zap } from "lucide-react";

const features = [
  {
    icon: Fuel,
    title: "Gasless",
    subtitle: "Zero Transaction Fees",
    description: "Our relayer covers all gas costs. You pay nothing for transactions, just the value you're sending.",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    glowColor: "rgba(34, 211, 238, 0.3)",
  },
  {
    icon: Zap,
    title: "Instant",
    subtitle: "Sub-Second Settlement",
    description:
      "Base network processes transactions in milliseconds. Tap and it's done, no confirmations to wait for.",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
    glowColor: "rgba(242, 169, 0, 0.3)",
  },
  {
    icon: Coins,
    title: "USDC",
    subtitle: "Stable Value",
    description: "All payments in USDC. No volatile tokens, no price surprises. $1 in = $1 out, always.",
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/20",
    glowColor: "rgba(34, 197, 94, 0.3)",
  },
];

interface FeatureRowProps {
  feature: (typeof features)[0];
  index: number;
}

function FeatureRow({ feature, index }: FeatureRowProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className={`relative flex items-center gap-6 sm:gap-8 p-6 sm:p-8 rounded-2xl border ${feature.borderColor} bg-base-200/30 backdrop-blur-sm overflow-hidden`}
        style={{
          boxShadow: `0 0 0 rgba(0,0,0,0)`,
        }}
      >
        {/* Hover glow */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 20% 50%, ${feature.glowColor}, transparent 60%)`,
          }}
        />

        {/* Icon */}
        <motion.div
          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
          transition={{ duration: 0.4 }}
          className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${feature.bgColor} border ${feature.borderColor} flex items-center justify-center`}
        >
          <Icon className={`w-8 h-8 sm:w-10 sm:h-10 ${feature.color}`} />

          {/* Pulse ring on view */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={isInView ? { scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] } : {}}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            className={`absolute inset-0 rounded-2xl border-2 ${feature.borderColor}`}
          />
        </motion.div>

        {/* Content */}
        <div className="relative flex-1">
          <div className="flex items-baseline gap-3 mb-2">
            <h3 className={`font-[family-name:var(--font-archivo)] text-2xl sm:text-3xl font-bold ${feature.color}`}>
              {feature.title}
            </h3>
            <span className="font-[family-name:var(--font-outfit)] text-base-content/40 text-sm font-medium">
              {feature.subtitle}
            </span>
          </div>
          <p className="font-[family-name:var(--font-outfit)] text-base-content/60 text-sm sm:text-base leading-relaxed max-w-lg font-light">
            {feature.description}
          </p>
        </div>

        {/* Decorative element */}
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Icon className={`w-32 h-32 ${feature.color}`} />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function HowItWorksEase() {
  return (
    <section className="py-20 sm:py-28 px-4">
      <div className="max-w-4xl mx-auto">
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
            className="font-[family-name:var(--font-outfit)] inline-block text-xs font-semibold text-base-content/50 uppercase tracking-widest mb-3"
          >
            Why It Works
          </motion.span>
          <h2 className="font-[family-name:var(--font-archivo)] text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Crypto payments
            <br />
            <span className="text-primary">without the </span> complexity.
          </h2>
          <p className="font-[family-name:var(--font-outfit)] text-base-content/50 text-lg max-w-xl mx-auto font-light">
            We removed every friction point between your stablecoins and the real world.
          </p>
        </motion.div>

        {/* Vertical feature list */}
        <div className="space-y-6">
          {features.map((feature, index) => (
            <FeatureRow key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Bottom accent */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        />
      </div>
    </section>
  );
}

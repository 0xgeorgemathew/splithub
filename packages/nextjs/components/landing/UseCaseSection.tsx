"use client";

import { useState } from "react";
import { FriendsAnimation } from "./FriendsAnimation";
import { VenuesAnimation } from "./VenuesAnimation";
import { AnimatePresence, motion } from "framer-motion";
import { ChartNoAxesCombined, Check, Nfc, Receipt, Wallet } from "lucide-react";

type Tab = "friends" | "venues";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

const friendsSteps = [
  {
    icon: Receipt,
    title: "Add Expense",
    description: "Log what you spent and who to split with",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Track Balances",
    description: "Green = owed to you. Red = you owe",
  },
  {
    icon: Nfc,
    title: "Tap to Settle",
    description: "One tap clears the debt instantly",
  },
];

const venuesSteps = [
  {
    icon: Wallet,
    title: "Load Credits",
    description: "Convert USDC to venue credits",
  },
  {
    icon: Nfc,
    title: "Tap & Spend",
    description: "Use wristband at any activity",
  },
  {
    icon: Check,
    title: "Auto-Settle",
    description: "Credits deducted in real-time",
  },
];

interface StepCardProps {
  step: (typeof friendsSteps)[0];
  index: number;
  category: Tab;
}

function StepCard({ step, index, category }: StepCardProps) {
  const Icon = step.icon;
  const accentColor = category === "friends" ? "primary" : "success";

  return (
    <motion.div
      variants={fadeUp}
      className="flex items-start gap-4 group"
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`relative flex-shrink-0 w-12 h-12 rounded-xl bg-${accentColor}/10 border border-${accentColor}/20 flex items-center justify-center`}
      >
        <Icon className={`w-5 h-5 text-${accentColor}`} />
        <motion.span
          className={`absolute -top-2 -right-2 w-5 h-5 rounded-full bg-${accentColor} text-${accentColor}-content text-xs font-bold flex items-center justify-center`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...springTransition, delay: 0.2 + index * 0.1 }}
        >
          {index + 1}
        </motion.span>
      </div>
      <div className="pt-1">
        <h4 className="font-[family-name:var(--font-bricolage)] text-base font-bold mb-0.5">{step.title}</h4>
        <p className="text-base-content/50 text-sm">{step.description}</p>
      </div>
    </motion.div>
  );
}

export function UseCaseSection() {
  const [activeTab, setActiveTab] = useState<Tab>("friends");

  const steps = activeTab === "friends" ? friendsSteps : venuesSteps;

  return (
    <section id="features" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="font-[family-name:var(--font-bricolage)] text-3xl sm:text-4xl font-bold mb-3">How It Works</h2>
          <p className="text-base-content/50 text-lg">Two ways to use SplitHub</p>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex bg-base-200 rounded-full p-1.5 gap-1">
            {(["friends", "venues"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-6 py-2.5 text-sm font-semibold rounded-full transition-colors duration-200 ${
                  activeTab === tab ? "text-primary-content" : "text-base-content/60 hover:text-base-content"
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="useCaseActiveTab"
                    className={`absolute inset-0 rounded-full ${tab === "friends" ? "bg-primary" : "bg-success"}`}
                    transition={springTransition}
                  />
                )}
                <span className="relative z-10">{tab === "friends" ? "For Friends" : "For Venues"}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
          >
            {/* Left: Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="order-2 lg:order-1"
            >
              <div
                className={`relative bg-base-200/50 rounded-3xl p-6 border border-base-300/50 ${
                  activeTab === "friends" ? "border-l-primary/30" : "border-l-success/30"
                } border-l-4`}
              >
                {activeTab === "friends" ? <FriendsAnimation /> : <VenuesAnimation />}
              </div>
            </motion.div>

            {/* Right: Steps */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="order-1 lg:order-2 space-y-6"
            >
              {steps.map((step, idx) => (
                <StepCard key={step.title} step={step} index={idx} category={activeTab} />
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

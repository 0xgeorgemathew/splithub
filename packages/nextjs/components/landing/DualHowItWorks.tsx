"use client";

import { ReactNode } from "react";
import { fadeUpVariants, staggerContainerVariants } from "./animations";
import { motion } from "framer-motion";
import { ChartNoAxesCombined, Check, Nfc, Receipt, Wallet } from "lucide-react";

type Category = "friends" | "venues";

interface StepProps {
  number: number;
  icon: ReactNode;
  title: string;
  description: string;
  category: Category;
  isLast?: boolean;
}

function Step({ number, icon, title, description, category, isLast }: StepProps) {
  const bgColor = category === "friends" ? "bg-primary/10" : "bg-success/10";
  const borderColor = category === "friends" ? "border-primary" : "border-success";
  const badgeBg = category === "friends" ? "bg-primary" : "bg-success";

  return (
    <motion.div variants={fadeUpVariants} className="flex flex-col items-center text-center relative">
      {/* Step number with icon */}
      <div className="relative mb-3">
        <div className={`w-14 h-14 rounded-full ${bgColor} border-2 ${borderColor} flex items-center justify-center`}>
          {icon}
        </div>
        <div
          className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full ${badgeBg} text-primary-content text-xs font-bold flex items-center justify-center`}
        >
          {number}
        </div>
      </div>

      {/* Content */}
      <h4 className="font-[family-name:var(--font-bricolage)] text-base font-bold mb-1">{title}</h4>
      <p className="text-base-content/60 text-xs max-w-[140px] leading-relaxed">{description}</p>

      {/* Vertical connector line (hidden on last step) */}
      {!isLast && <div className="w-0.5 h-6 bg-gradient-to-b from-base-300 to-transparent mt-3 sm:hidden" />}
    </motion.div>
  );
}

const friendsSteps = [
  {
    icon: <Receipt className="w-6 h-6 text-primary" />,
    title: "Add Expense",
    description: "Log what you spent and split with friends",
  },
  {
    icon: <ChartNoAxesCombined className="w-6 h-6 text-primary" />,
    title: "Track Balances",
    description: "See who owes you and who you owe",
  },
  {
    icon: <Nfc className="w-6 h-6 text-primary" />,
    title: "Tap to Settle",
    description: "One tap clears the debt instantly",
  },
];

const venuesSteps = [
  {
    icon: <Wallet className="w-6 h-6 text-success" />,
    title: "Load Credits",
    description: "Convert USDC to venue credits",
  },
  {
    icon: <Nfc className="w-6 h-6 text-success" />,
    title: "Tap & Spend",
    description: "Use wristband at any activity",
  },
  {
    icon: <Check className="w-6 h-6 text-success" />,
    title: "Auto-Settle",
    description: "Credits deducted in real-time",
  },
];

interface FlowColumnProps {
  title: string;
  steps: typeof friendsSteps;
  category: Category;
}

function FlowColumn({ title, steps, category }: FlowColumnProps) {
  const dotColor = category === "friends" ? "bg-primary" : "bg-success";

  return (
    <div className="flex-1">
      {/* Column header */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-sm font-medium text-base-content/70 uppercase tracking-wider">{title}</span>
      </div>

      {/* Steps */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-6 sm:gap-4"
      >
        {steps.map((step, idx) => (
          <div key={step.title} className="flex items-center sm:flex-col gap-4 sm:gap-0">
            <Step
              number={idx + 1}
              icon={step.icon}
              title={step.title}
              description={step.description}
              category={category}
              isLast={idx === steps.length - 1}
            />
            {/* Horizontal connector for desktop */}
            {idx < steps.length - 1 && (
              <div className="hidden sm:block w-8 h-0.5 bg-gradient-to-r from-base-300 to-transparent mt-7" />
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function DualHowItWorks() {
  return (
    <section className="py-16 px-4 bg-base-200/50">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-[family-name:var(--font-bricolage)] text-2xl sm:text-3xl font-bold text-center mb-12"
        >
          How It Works
        </motion.h2>

        {/* Dual flow container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8">
          {/* Friends flow */}
          <FlowColumn title="Split with Friends" steps={friendsSteps} category="friends" />

          {/* Venues flow */}
          <FlowColumn title="At Venues" steps={venuesSteps} category="venues" />
        </div>
      </div>
    </section>
  );
}

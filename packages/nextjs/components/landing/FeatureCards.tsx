"use client";

import { ReactNode } from "react";
import { fadeUpVariants, staggerContainerVariants } from "./animations";
import { motion } from "framer-motion";
import { CreditCard, Fuel, Scale, Split, Ticket, Zap } from "lucide-react";

type Category = "friends" | "venues";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  category: Category;
}

function FeatureCard({ icon, title, description, category }: FeatureCardProps) {
  const borderColor = category === "friends" ? "border-l-primary" : "border-l-success";
  const hoverBorder = category === "friends" ? "hover:border-primary/30" : "hover:border-success/30";

  return (
    <motion.div
      variants={fadeUpVariants}
      className={`bg-base-200 border border-base-300/50 ${borderColor} border-l-[3px] rounded-2xl p-5 ${hoverBorder} transition-all duration-300`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
          category === "friends" ? "bg-primary/10" : "bg-success/10"
        }`}
      >
        {icon}
      </div>
      <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-bold mb-1.5">{title}</h3>
      <p className="text-base-content/60 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

const friendsFeatures = [
  {
    icon: <Split className="w-5 h-5 text-primary" />,
    title: "Split Expenses",
    description: "Create expense, select friends, done.",
  },
  {
    icon: <Scale className="w-5 h-5 text-primary" />,
    title: "Track Balances",
    description: "Green = owed to you. Red = you owe.",
  },
  {
    icon: <Zap className="w-5 h-5 text-primary" />,
    title: "Instant Settlement",
    description: "Tap your chip. Debt cleared in seconds.",
  },
];

const venuesFeatures = [
  {
    icon: <CreditCard className="w-5 h-5 text-success" />,
    title: "Load Credits",
    description: "Convert USDC to venue credits instantly.",
  },
  {
    icon: <Ticket className="w-5 h-5 text-success" />,
    title: "Tap at Activities",
    description: "Use your wristband at any station.",
  },
  {
    icon: <Fuel className="w-5 h-5 text-success" />,
    title: "Zero Friction",
    description: "No wallets. No popups. No gas fees.",
  },
];

export function FeatureCards() {
  return (
    <section id="features" className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* For Friends */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-base-content/80">
              For Friends
            </h3>
          </div>

          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {friendsFeatures.map(feature => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                category="friends"
              />
            ))}
          </motion.div>
        </div>

        {/* For Venues */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-success" />
            <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-base-content/80">
              For Venues
            </h3>
          </div>

          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {venuesFeatures.map(feature => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                category="venues"
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { ReactNode } from "react";
import { Nfc, Receipt, UserPlus } from "lucide-react";

interface StepProps {
  number: number;
  icon: ReactNode;
  title: string;
  description: string;
  isLast?: boolean;
}

function Step({ number, icon, title, description, isLast }: StepProps) {
  return (
    <div className="flex flex-col items-center text-center relative">
      {/* Step number with icon */}
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-content text-sm font-bold flex items-center justify-center">
          {number}
        </div>
      </div>

      {/* Content */}
      <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-bold mb-2">{title}</h3>
      <p className="text-base-content/60 text-sm max-w-[200px]">{description}</p>

      {/* Connector line (hidden on mobile, shown on larger screens) */}
      {!isLast && (
        <div className="hidden sm:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5 bg-base-300" />
      )}
    </div>
  );
}

const steps = [
  {
    icon: <UserPlus className="w-7 h-7 text-primary" />,
    title: "Register",
    description: "Create your profile and link your NFC chip",
  },
  {
    icon: <Receipt className="w-7 h-7 text-primary" />,
    title: "Add Expenses",
    description: "Log what you spent and who owes what",
  },
  {
    icon: <Nfc className="w-7 h-7 text-primary" />,
    title: "Tap to Settle",
    description: "Friends tap their chip to pay you back instantly",
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 px-4 bg-base-200/50">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-[family-name:var(--font-bricolage)] text-2xl sm:text-3xl font-bold text-center mb-12">
          How It Works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
          {steps.map((step, idx) => (
            <Step
              key={step.title}
              number={idx + 1}
              icon={step.icon}
              title={step.title}
              description={step.description}
              isLast={idx === steps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

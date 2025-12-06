"use client";

import { HeroSection } from "./HeroSection";
import { HowItWorksEase } from "./HowItWorksEase";
import { LandingFooter } from "./LandingFooter";
import { SecuritySection } from "./SecuritySection";
import { UseCaseCards } from "./UseCaseCards";

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* 1. Hero - Main value prop with phone mockup animation */}
      <HeroSection />

      {/* 2. Core Use Cases - Two distinct cards with hover interactions */}
      <UseCaseCards />

      {/* 3. How It Works (Ease) - Gasless, Instant, USDC */}
      <HowItWorksEase />

      {/* 4. Security Deep Dive - HaLo Chip + Onboarding */}
      <SecuritySection />

      {/* 5. Footer/CTA */}
      <LandingFooter />
    </div>
  );
}

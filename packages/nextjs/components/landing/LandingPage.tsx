"use client";

import { DualHowItWorks } from "./DualHowItWorks";
import { FeatureCards } from "./FeatureCards";
import { HeroSection } from "./HeroSection";
import { LandingFooter } from "./LandingFooter";

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeatureCards />
      <DualHowItWorks />
      <LandingFooter />
    </div>
  );
}

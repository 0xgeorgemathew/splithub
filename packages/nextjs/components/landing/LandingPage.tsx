"use client";

import { DualHowItWorks } from "./DualHowItWorks";
import { FeatureCards } from "./FeatureCards";
import { HeroSection } from "./HeroSection";
import { LandingFooter } from "./LandingFooter";
import { usePrivy } from "@privy-io/react-auth";

export function LandingPage() {
  const { ready, authenticated } = usePrivy();

  // Show minimal loading for authenticated users (redirect happens in UserSyncWrapper)
  if (ready && authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Show public landing page for unauthenticated users
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeatureCards />
      <DualHowItWorks />
      <LandingFooter />
    </div>
  );
}

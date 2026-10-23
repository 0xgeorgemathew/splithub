"use client";

import { HeroSection } from "./HeroSection";
import { LandingFooter } from "./LandingFooter";
import { ProductIndex } from "./ProductIndex";
import { SecuritySection } from "./SecuritySection";
import { MotionConfig } from "framer-motion";

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      {/* Bleed over the app shell padding so the landing background runs edge to edge */}
      <div className="-mt-20 -mb-24 min-h-screen overflow-x-hidden bg-base-100">
        {/* 1. Hero - thesis plus a receipt printing one tap */}
        <HeroSection />

        {/* 2. Products - Stores, Venues, Splits */}
        <ProductIndex />

        {/* 3. Chip as authorization device */}
        <SecuritySection />

        {/* 4. CTA + footer */}
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}

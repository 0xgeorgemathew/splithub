"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface OnboardingFinalizerProps {
  isOpen: boolean;
}

/**
 * Full-screen loader overlay shown during onboarding finalization.
 * Displays while backend checks run after skip/register actions.
 */
export function OnboardingFinalizer({ isOpen }: OnboardingFinalizerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-300/95 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="text-center space-y-6 px-4"
      >
        {/* Animated spinner */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute w-32 h-32 rounded-full border-4 border-primary/20" />
          <div className="absolute w-32 h-32 rounded-full border-4 border-t-primary border-r-primary/50 border-b-transparent border-l-transparent animate-spin" />
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        </div>

        {/* Status text */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-base-content">Checking your account…</h3>
          <p className="text-base-content/60 text-sm max-w-xs mx-auto">
            We&apos;re finalizing your setup — this should only take a few seconds.
          </p>
        </div>

        {/* Progress indicator dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "200ms" }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "400ms" }} />
        </div>
      </motion.div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Key, Lock, Shield, Wallet } from "lucide-react";

export function SecuritySection() {
  const [chipAnimationPhase, setChipAnimationPhase] = useState<"idle" | "generating" | "signing" | "done">("idle");
  const [onboardingPhase, setOnboardingPhase] = useState<number>(0);

  // Chip animation loop
  useEffect(() => {
    const phases: Array<"idle" | "generating" | "signing" | "done"> = ["idle", "generating", "signing", "done"];
    const durations = [1500, 1500, 1200, 2000];
    let currentIndex = 0;

    const cycle = () => {
      setChipAnimationPhase(phases[currentIndex]);
      const timeout = setTimeout(() => {
        currentIndex = (currentIndex + 1) % phases.length;
        cycle();
      }, durations[currentIndex]);
      return timeout;
    };

    const timeout = cycle();
    return () => clearTimeout(timeout);
  }, []);

  // Onboarding animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setOnboardingPhase(p => (p + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 sm:py-28 px-4 bg-gradient-to-b from-base-100 to-base-200/50">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-success uppercase tracking-wider mb-3 px-3 py-1 bg-success/10 rounded-full"
          >
            <Shield className="w-3 h-3" />
            <span>Security</span>
          </motion.div>
          <h2 className="font-[family-name:var(--font-bricolage)] text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Safety Without Sacrifice
          </h2>
          <p className="text-base-content/50 text-lg max-w-xl mx-auto">
            Hardware-level security meets seamless UX. Your keys never leave the chip.
          </p>
        </motion.div>

        {/* Two feature blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* HaLo Chip Security */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative bg-base-200/50 rounded-3xl p-8 border border-base-300/50 overflow-hidden"
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <pattern id="circuit" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 10 10 M 0 10 L 20 10" stroke="currentColor" strokeWidth="0.5" fill="none" />
                </pattern>
                <rect width="100" height="100" fill="url(#circuit)" />
              </svg>
            </div>

            <div className="relative">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center flex-shrink-0">
                  <Key className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-bricolage)] text-xl font-bold mb-1">Arx HaLo Chip</h3>
                  <p className="text-base-content/50 text-sm">On-chip key generation & signing</p>
                </div>
              </div>

              {/* Animated Chip Visualization */}
              <div className="relative h-48 flex items-center justify-center mb-6">
                {/* Chip container */}
                <motion.div
                  animate={{
                    boxShadow:
                      chipAnimationPhase === "signing"
                        ? "0 0 40px rgba(34, 197, 94, 0.5)"
                        : chipAnimationPhase === "done"
                          ? "0 0 20px rgba(34, 197, 94, 0.3)"
                          : "0 0 10px rgba(34, 197, 94, 0.1)",
                  }}
                  transition={{ duration: 0.3 }}
                  className="relative w-28 h-28 rounded-2xl bg-gradient-to-br from-base-300 to-base-300/80 border border-base-content/10 flex items-center justify-center"
                >
                  {/* Chip internals */}
                  <div className="absolute inset-3 rounded-lg border border-dashed border-base-content/20" />

                  {/* Key generation animation */}
                  <motion.div
                    animate={{
                      scale: chipAnimationPhase === "generating" ? [1, 1.2, 1] : 1,
                      opacity: chipAnimationPhase === "idle" ? 0.5 : 1,
                    }}
                    transition={{ duration: 0.5, repeat: chipAnimationPhase === "generating" ? Infinity : 0 }}
                    className="relative"
                  >
                    <Key className="w-8 h-8 text-success" />

                    {/* Particles during generation */}
                    {chipAnimationPhase === "generating" && (
                      <>
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{
                              opacity: [0, 1, 0],
                              scale: [0, 1, 0],
                              x: Math.cos((i * Math.PI) / 3) * 30,
                              y: Math.sin((i * Math.PI) / 3) * 30,
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                            className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-success"
                          />
                        ))}
                      </>
                    )}
                  </motion.div>

                  {/* Lock animation on signing */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: chipAnimationPhase === "signing" || chipAnimationPhase === "done" ? 1 : 0,
                      scale: chipAnimationPhase === "signing" || chipAnimationPhase === "done" ? 1 : 0,
                    }}
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-success flex items-center justify-center"
                  >
                    <motion.div
                      animate={{
                        rotate: chipAnimationPhase === "signing" ? [0, -10, 10, 0] : 0,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <Lock className="w-4 h-4 text-success-content" />
                    </motion.div>
                  </motion.div>

                  {/* NFC waves */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                    <svg width="40" height="20" viewBox="0 0 40 20">
                      <motion.path
                        d="M10 15 Q20 5 30 15"
                        stroke="#22c55e"
                        strokeWidth="2"
                        fill="none"
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </svg>
                  </div>
                </motion.div>

                {/* Phase indicator */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                  <motion.span
                    key={chipAnimationPhase}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-success font-medium"
                  >
                    {chipAnimationPhase === "idle" && "Ready"}
                    {chipAnimationPhase === "generating" && "Generating Key..."}
                    {chipAnimationPhase === "signing" && "Signing..."}
                    {chipAnimationPhase === "done" && "Signed"}
                  </motion.span>
                </div>
              </div>

              <p className="text-sm text-base-content/60 text-center">
                Private keys are generated and stored on the chip.
                <br />
                They never leave the secure enclave.
              </p>
            </div>
          </motion.div>

          {/* Seamless Onboarding */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative bg-base-200/50 rounded-3xl p-8 border border-base-300/50 overflow-hidden"
          >
            <div className="relative">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-bricolage)] text-xl font-bold mb-1">
                    Seamless Onboarding
                  </h3>
                  <p className="text-base-content/50 text-sm">Social login to crypto wallet in seconds</p>
                </div>
              </div>

              {/* Onboarding Flow Animation */}
              <div className="relative h-48 flex items-center justify-center mb-6">
                <div className="flex items-center gap-4">
                  {/* Step indicators */}
                  {[
                    { icon: "X", label: "Login", bgClass: "bg-base-300" },
                    { icon: "arrow", label: "" },
                    { icon: Wallet, label: "Wallet", bgClass: "bg-primary/20" },
                    { icon: "arrow", label: "" },
                    { icon: Check, label: "Ready", bgClass: "bg-success/20" },
                  ].map((step, i) => {
                    if (step.icon === "arrow") {
                      return (
                        <motion.div
                          key={i}
                          animate={{
                            opacity: onboardingPhase >= Math.floor(i / 2) ? 1 : 0.3,
                            scale: onboardingPhase === Math.floor(i / 2) ? 1.2 : 1,
                          }}
                          className="text-base-content/30"
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 12h14M13 6l6 6-6 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </motion.div>
                      );
                    }

                    const stepIndex = Math.floor(i / 2);
                    const isActive = onboardingPhase === stepIndex;
                    const isComplete = onboardingPhase > stepIndex;
                    const Icon = step.icon;

                    return (
                      <motion.div
                        key={i}
                        animate={{
                          scale: isActive ? 1.1 : 1,
                          opacity: isComplete || isActive ? 1 : 0.5,
                        }}
                        className="flex flex-col items-center gap-2"
                      >
                        <motion.div
                          animate={{
                            boxShadow: isActive
                              ? stepIndex === 0
                                ? "0 0 20px rgba(255,255,255,0.2)"
                                : stepIndex === 1
                                  ? "0 0 20px rgba(242, 169, 0, 0.4)"
                                  : "0 0 20px rgba(34, 197, 94, 0.4)"
                              : "none",
                          }}
                          className={`w-14 h-14 rounded-xl ${step.bgClass} border border-base-content/10 flex items-center justify-center`}
                        >
                          {step.icon === "X" ? (
                            <span className="text-xl font-bold text-base-content/70">X</span>
                          ) : (
                            <Icon
                              className={`w-6 h-6 ${stepIndex === 1 ? "text-primary" : stepIndex === 2 ? "text-success" : "text-base-content/70"}`}
                            />
                          )}
                        </motion.div>
                        <span className="text-xs text-base-content/50">{step.label}</span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-1 bg-base-300 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${(onboardingPhase / 3) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-primary to-success rounded-full"
                  />
                </div>
              </div>

              <p className="text-sm text-base-content/60 text-center">
                Log in with X, Google, or email.
                <br />
                Your wallet is created automatically via Privy.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { StallAmountEntry } from "./cards/StallAmountEntry";
import { StallErrorCard } from "./cards/StallErrorCard";
import { StallProcessingCard } from "./cards/StallProcessingCard";
import { StallSuccessCard } from "./cards/StallSuccessCard";
import { StallTapCard } from "./cards/StallTapCard";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { CalendarDays, Store, User } from "lucide-react";
import { usePaymentNotification } from "~~/hooks/usePaymentNotification";
import { type StallPaymentFlowState, useStallPayment } from "~~/hooks/useStallPayment";
import type { Event, Stall } from "~~/lib/events.types";

interface StallTerminalProps {
  stall: Stall;
  event: Event;
}

const CHAIN_ID = 84532;

// Terminal entrance - bouncy 3D entry with perspective
const terminalVariants = {
  hidden: {
    y: 100,
    opacity: 0,
    scale: 0.9,
    rotateX: 15,
  },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    rotateX: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      mass: 1,
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

// Header items stagger in
const headerVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
};

// Card animation variants - bouncier
const cardVariants = {
  initial: { y: 50, opacity: 0, scale: 0.94 },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 22,
    },
  },
  exit: {
    y: -30,
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

// Screen glow states - clean, no glow
function getScreenGlow(phase: CardPhase): string {
  switch (phase) {
    case "error":
      return "0 0 50px rgba(239, 68, 68, 0.35), inset 0 0 60px rgba(239, 68, 68, 0.05)";
    default:
      return "none";
  }
}

// Map flow state to visual phase
type CardPhase = "entry" | "tapping" | "processing" | "success" | "error";

function mapFlowToPhase(flowState: StallPaymentFlowState): CardPhase {
  switch (flowState) {
    case "idle":
      return "entry";
    case "tapping":
      return "tapping";
    case "submitting":
    case "confirming":
      return "processing";
    case "success":
      return "success";
    case "error":
      return "error";
    default:
      return "entry";
  }
}

export function StallTerminal({ stall, event }: StallTerminalProps) {
  const [amount, setAmount] = useState(5);
  const controls = useAnimationControls();
  const { playNotification, prime } = usePaymentNotification();

  const { flowState, error, txHash, initiatePayment, reset } = useStallPayment({
    stall,
    eventOwnerWallet: event.owner_wallet,
    onSuccess: hash => {
      console.log("Payment successful:", hash);
      // Play PhonePe-style notification: chime + voice announcement
      playNotification(amount);
    },
    onError: err => {
      console.error("Payment failed:", err);
      // Trigger shake animation on error
      controls.start({
        x: [0, -8, 8, -8, 8, -4, 4, 0],
        transition: { duration: 0.5, ease: "easeOut" },
      });
    },
  });

  const phase = mapFlowToPhase(flowState);
  const screenGlow = getScreenGlow(phase);

  const handleTap = () => {
    // Prime audio/speech on user gesture (unlocks on mobile)
    prime(amount);
    initiatePayment(amount);
  };

  const handleRetry = () => {
    reset();
  };

  const handleDismiss = () => {
    reset();
  };

  return (
    <motion.div className="stall-terminal" variants={terminalVariants} initial="hidden" animate="visible">
      {/* Terminal Frame */}
      <motion.div className="stall-terminal-frame" animate={controls}>
        {/* Speaker grille - staggered reveal */}
        <motion.div className="stall-speaker-grille" variants={headerVariants}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="stall-speaker-slot"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
            />
          ))}
        </motion.div>

        {/* Main Screen - with breathing glow */}
        <motion.div
          className="stall-screen"
          animate={{ boxShadow: screenGlow }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Screen bezel */}
          <div className="stall-screen-bezel" />

          {/* Header - Stall & Event Info with staggered animation */}
          <motion.div className="stall-header" variants={headerVariants}>
            <motion.div
              className="stall-header-event"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 400, damping: 30 }}
            >
              <CalendarDays className="w-4 h-4" />
              <span>{event.event_name}</span>
            </motion.div>

            <motion.div
              className="stall-header-stall"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 30 }}
            >
              <Store className="w-6 h-6 text-amber-400" />
              <span className="stall-header-name">{stall.stall_name}</span>
            </motion.div>

            {stall.operator_user && (
              <motion.div
                className="stall-header-operator"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 400, damping: 30 }}
              >
                {stall.operator_user.twitter_profile_url ? (
                  <Image
                    src={stall.operator_user.twitter_profile_url}
                    alt={stall.operator_twitter_handle}
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded-full ring-1 ring-white/10"
                  />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span>@{stall.operator_twitter_handle}</span>
              </motion.div>
            )}
          </motion.div>

          {/* Content Area */}
          <div className="stall-screen-content">
            <AnimatePresence mode="wait">
              {phase === "entry" && (
                <motion.div key="entry" variants={cardVariants} initial="initial" animate="animate" exit="exit">
                  <StallAmountEntry
                    amount={amount}
                    onAmountChange={setAmount}
                    onSubmit={handleTap}
                    disabled={flowState !== "idle"}
                  />
                </motion.div>
              )}

              {phase === "tapping" && (
                <motion.div key="tapping" variants={cardVariants} initial="initial" animate="animate" exit="exit">
                  <StallTapCard amount={amount} />
                </motion.div>
              )}

              {phase === "processing" && (
                <motion.div key="processing" variants={cardVariants} initial="initial" animate="animate" exit="exit">
                  <StallProcessingCard phase={flowState === "confirming" ? "confirming" : "sending"} />
                </motion.div>
              )}

              {phase === "success" && (
                <motion.div key="success" variants={cardVariants} initial="initial" animate="animate" exit="exit">
                  <StallSuccessCard
                    amount={amount}
                    stallName={stall.stall_name}
                    txHash={txHash}
                    chainId={CHAIN_ID}
                    onDismiss={handleDismiss}
                  />
                </motion.div>
              )}

              {phase === "error" && (
                <motion.div key="error" variants={cardVariants} initial="initial" animate="animate" exit="exit">
                  <StallErrorCard message={error || "Payment failed"} onRetry={handleRetry} onDismiss={handleDismiss} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Branding */}
        <motion.div
          className="stall-branding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <span className="stall-brand-text">SPLITHUB</span>
          <motion.div
            className="stall-brand-accent"
            animate={{
              boxShadow: [
                "0 0 4px rgba(251, 191, 36, 0.3)",
                "0 0 8px rgba(251, 191, 36, 0.6)",
                "0 0 4px rgba(251, 191, 36, 0.3)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Card Slot */}
        <motion.div
          className="stall-card-slot"
          initial={{ opacity: 0, scaleX: 0.5 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <div className="stall-card-slot-inner" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

import { useState } from "react";
import { StallAmountEntry } from "./cards/StallAmountEntry";
import { StallErrorCard } from "./cards/StallErrorCard";
import { StallProcessingCard } from "./cards/StallProcessingCard";
import { StallSuccessCard } from "./cards/StallSuccessCard";
import { StallTapCard } from "./cards/StallTapCard";
import { formatTerminalAmount } from "./units";
import { AnimatePresence, type Variants, motion, useAnimationControls } from "framer-motion";
import { Coins, MapPin, Store } from "lucide-react";
import { usePaymentNotification } from "~~/hooks/usePaymentNotification";
import { type VenueTapStep, useVenueCredits } from "~~/hooks/useVenueCredits";
import { createFreshBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import type { Venue, VenueStall } from "~~/lib/venue.types";
import { formatCredits, getCreditBalance, usdcToCredits } from "~~/lib/venueCredits";
import { parseContractError } from "~~/utils/contractErrors";

const CHAIN_ID = 84532;

// Terminal entrance - bouncy 3D entry with perspective
const terminalVariants: Variants = {
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
const headerVariants: Variants = {
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
const cardVariants: Variants = {
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

type CardPhase = "entry" | "tapping" | "processing" | "success" | "error";
type FlowState = "idle" | VenueTapStep | "success" | "error";

function mapFlowToPhase(flowState: FlowState): CardPhase {
  switch (flowState) {
    case "identifying":
    case "tapping":
      return "tapping";
    case "submitting":
    case "confirming":
    case "recording":
      return "processing";
    case "success":
    case "error":
      return flowState;
    default:
      return "entry";
  }
}

export type VenueTerminalMode = { kind: "topup" } | { kind: "spend"; stall: VenueStall };

interface VenueTerminalProps {
  venue: Venue & { chain_venue_id: number };
  mode: VenueTerminalMode;
}

/**
 * Venue terminal. Top-up mode sells the venue's credits for USDC; stall mode takes credits. The guest taps
 * twice (identify, then sign) and the wallet signed in on this device submits to VenueCredits.
 */
export function VenueTerminal({ venue, mode }: VenueTerminalProps) {
  const unit = mode.kind === "topup" ? "usdc" : "credits";
  const fixedPrice = mode.kind === "spend" ? mode.stall.credit_price : null;
  const [amount, setAmount] = useState(fixedPrice ?? (unit === "usdc" ? 5 : 20));
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const controls = useAnimationControls();
  const { playNotification, prime } = usePaymentNotification();
  const { topUp, spend } = useVenueCredits();

  const phase = mapFlowToPhase(flowState);
  const screenGlow = getScreenGlow(phase);

  const handleTap = async () => {
    prime(amount);
    setError(null);
    setTxHash(null);
    setBalance(null);
    try {
      const result =
        mode.kind === "topup"
          ? await topUp({ chainVenueId: venue.chain_venue_id, usdcAmount: amount }, setFlowState)
          : await spend({ chainVenueId: venue.chain_venue_id, credits: amount, stallId: mode.stall.id }, setFlowState);
      setTxHash(result.txHash);
      const units = await getCreditBalance(
        createFreshBaseSepoliaPublicClient(),
        venue.chain_venue_id,
        result.guest,
      ).catch(() => null);
      setBalance(units === null ? null : formatCredits(units));
      setFlowState("success");
      playNotification(amount);
    } catch (err) {
      console.error("Venue terminal error:", err);
      setError(parseContractError(err) || (err instanceof Error ? err.message : "Payment failed"));
      setFlowState("error");
      controls.start({ x: [0, -8, 8, -8, 8, -4, 4, 0], transition: { duration: 0.5, ease: "easeOut" } });
    }
  };

  const reset = () => {
    setFlowState("idle");
    setError(null);
    setTxHash(null);
    if (fixedPrice === null) return;
    setAmount(fixedPrice);
  };

  const successTitle = mode.kind === "topup" ? "Credits Added" : "Paid with Credits";
  const successAmount = mode.kind === "topup" ? usdcToCredits(amount) : amount;
  const balanceText = balance === null ? "" : ` · Balance ${formatTerminalAmount(balance, "credits")}`;
  const successDetail =
    mode.kind === "topup"
      ? `${formatTerminalAmount(amount, "usdc")} paid${balanceText}`
      : `${mode.stall.stall_name}${balanceText}`;

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
              <MapPin className="w-4 h-4" />
              <span>{venue.venue_name}</span>
            </motion.div>

            <motion.div
              className="stall-header-stall"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 30 }}
            >
              {mode.kind === "topup" ? (
                <Coins className="w-6 h-6 text-amber-400" />
              ) : (
                <Store className="w-6 h-6 text-amber-400" />
              )}
              <span className="stall-header-name">
                {mode.kind === "topup" ? "Top up credits" : mode.stall.stall_name}
              </span>
            </motion.div>
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
                    unit={unit}
                    fixed={fixedPrice !== null}
                    label={mode.kind === "topup" ? "Top-up amount" : "Price"}
                    actionLabel={mode.kind === "topup" ? "TAP TO TOP UP" : "TAP TO PAY"}
                  />
                  {mode.kind === "topup" && (
                    <p className="mt-3 text-center text-xs text-zinc-500">
                      {formatTerminalAmount(amount, "usdc")} buys{" "}
                      {formatTerminalAmount(usdcToCredits(amount), "credits")} to spend at {venue.venue_name}
                    </p>
                  )}
                </motion.div>
              )}

              {phase === "tapping" && (
                <motion.div key="tapping" variants={cardVariants} initial="initial" animate="animate" exit="exit">
                  <StallTapCard amount={amount} unit={unit} confirm={flowState === "tapping"} />
                </motion.div>
              )}

              {phase === "processing" && (
                <motion.div key="processing" variants={cardVariants} initial="initial" animate="animate" exit="exit">
                  <StallProcessingCard phase={flowState === "submitting" ? "sending" : "confirming"} />
                </motion.div>
              )}

              {phase === "success" && (
                <motion.div key="success" variants={cardVariants} initial="initial" animate="animate" exit="exit">
                  <StallSuccessCard
                    amount={successAmount}
                    unit="credits"
                    title={successTitle}
                    detail={successDetail}
                    txHash={txHash}
                    chainId={CHAIN_ID}
                    onDismiss={reset}
                  />
                </motion.div>
              )}

              {phase === "error" && (
                <motion.div key="error" variants={cardVariants} initial="initial" animate="animate" exit="exit">
                  <StallErrorCard message={error || "Payment failed"} onRetry={reset} onDismiss={reset} />
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

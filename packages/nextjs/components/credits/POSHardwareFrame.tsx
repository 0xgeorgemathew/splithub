"use client";

import { ReactNode, useEffect, useState } from "react";
import { LedState, POSLed } from "./POSLed";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Gamepad2, Power } from "lucide-react";
import { CreditFlowState } from "~~/hooks/credits/useCreditPurchase";

interface POSHardwareFrameProps {
  children: ReactNode;
  flowState: CreditFlowState;
  onClose?: () => void;
  onOpenMenu?: () => void;
}

// Map flow state to LED state
function mapToLedState(flowState: CreditFlowState): LedState {
  switch (flowState) {
    case "tapping":
    case "signing":
    case "submitting":
    case "confirming":
      return "processing";
    case "success":
      return "success";
    case "error":
    case "idle":
    default:
      return "idle";
  }
}

// Shake animation keyframes for error state
const shakeAnimation = {
  x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0],
};

export function POSHardwareFrame({ children, flowState, onClose, onOpenMenu }: POSHardwareFrameProps) {
  const controls = useAnimationControls();
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const ledState = mapToLedState(flowState);

  // Trigger shake animation on error
  useEffect(() => {
    if (flowState === "error") {
      controls.start({
        ...shakeAnimation,
        transition: { duration: 0.5, ease: "easeOut" },
      });
    }
  }, [flowState, controls]);

  // Track mouse position for glass reflection effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePosition({ x, y });
  };

  return (
    <motion.div className="pos-hardware-frame" animate={controls} onMouseMove={handleMouseMove}>
      {/* Top speaker grille */}
      <div className="pos-speaker-grille">
        <div className="pos-speaker-slot" />
        <div className="pos-speaker-slot" />
        <div className="pos-speaker-slot" />
      </div>

      {/* Status LED - using Framer Motion component */}
      <div className="pos-led-container">
        <POSLed state={ledState} />
      </div>

      {/* Main screen area */}
      <div className="pos-screen">
        {/* Screen bezel highlight */}
        <div className="pos-screen-bezel" />

        {/* Glass reflection effect - parallax based on mouse */}
        <motion.div
          className="pos-screen-reflection"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
            borderRadius: "inherit",
            background: `linear-gradient(
              ${135 + (mousePosition.x - 0.5) * 30}deg,
              rgba(255, 255, 255, 0.08) 0%,
              rgba(255, 255, 255, 0.02) 30%,
              transparent 50%,
              rgba(255, 255, 255, 0.01) 80%,
              rgba(255, 255, 255, 0.04) 100%
            )`,
          }}
          animate={{
            background: `linear-gradient(
              ${135 + (mousePosition.x - 0.5) * 30}deg,
              rgba(255, 255, 255, 0.08) 0%,
              rgba(255, 255, 255, 0.02) 30%,
              transparent 50%,
              rgba(255, 255, 255, 0.01) 80%,
              rgba(255, 255, 255, 0.04) 100%
            )`,
          }}
          transition={{ duration: 0.1 }}
        />

        {/* Content with AnimatePresence for crossfade */}
        <div className="pos-screen-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={flowState === "idle" || flowState === "error" ? "entry" : "receipt"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ width: "100%", height: "100%" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom branding area */}
      <div className="pos-branding">
        <span className="pos-brand-text">SPLITHUB</span>
        <div className="pos-brand-accent" />
      </div>

      {/* Card slot indicator with inner shadow for receipt emergence */}
      <div className="pos-card-slot">
        <div
          className="pos-card-slot-inner"
          style={{
            boxShadow: "inset 0 4px 8px rgba(0, 0, 0, 0.6)",
          }}
        />
      </div>

      {/* Hardware Control Bar (Chin) */}
      <div className="pos-hardware-chin">
        {/* Game/Activities Button - Left */}
        {onOpenMenu && (
          <motion.button
            className="pos-chin-btn pos-chin-btn-game"
            onClick={onOpenMenu}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Open activities menu"
          >
            <Gamepad2 className="w-5 h-5" />
          </motion.button>
        )}

        {/* Spacer */}
        <div className="pos-chin-spacer" />

        {/* Power Button - Right */}
        {onClose && (
          <motion.button
            className="pos-chin-btn pos-chin-btn-power"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Close terminal"
          >
            <Power className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

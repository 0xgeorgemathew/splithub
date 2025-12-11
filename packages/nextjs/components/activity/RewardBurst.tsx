"use client";

import { useEffect, useState } from "react";
import { colors } from "./styles";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface RewardBurstProps {
  amount: number;
  unit?: string;
  remainingBalance?: number | null;
  onAnimationComplete?: () => void;
  /** "spend" shows -amount with "Credits Spent", "purchase" shows +amount with "Credits Earned" */
  variant?: "spend" | "purchase";
}

// Generate random particles for the burst effect
function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (360 / count) * i + Math.random() * 30 - 15,
    distance: 60 + Math.random() * 40,
    size: 4 + Math.random() * 6,
    delay: Math.random() * 0.2,
    duration: 0.8 + Math.random() * 0.4,
    // Use yellow-500 variants for particles
    color: Math.random() > 0.5 ? colors.reward.primary : colors.reward.light,
  }));
}

// Radial burst particle
function BurstParticle({
  angle,
  distance,
  size,
  delay,
  duration,
  color,
}: {
  angle: number;
  distance: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
}) {
  const radian = (angle * Math.PI) / 180;
  const x = Math.cos(radian) * distance;
  const y = Math.sin(radian) * distance;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        left: "50%",
        top: "50%",
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
      initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
      animate={{
        x: [0, x * 0.5, x],
        y: [0, y * 0.5, y],
        scale: [0, 1.5, 0],
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: duration,
        delay: delay,
        ease: "easeOut",
      }}
    />
  );
}

// Sparkle trail effect
function SparkleTrail() {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
          }}
          initial={{ rotate: i * 45, scale: 0, opacity: 0 }}
          animate={{
            rotate: i * 45,
            scale: [0, 1, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 0.6,
            delay: 0.1 + i * 0.05,
            ease: "easeOut",
          }}
        >
          <motion.div
            className="absolute w-1"
            style={{
              height: 30 + Math.random() * 20,
              transformOrigin: "bottom center",
              marginLeft: -2,
              background: `linear-gradient(to top, ${colors.reward.primary}, transparent)`,
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: [0, 1, 0] }}
            transition={{
              duration: 0.5,
              delay: 0.1 + i * 0.05,
              ease: "easeOut",
            }}
          />
        </motion.div>
      ))}
    </>
  );
}

export function RewardBurst({
  amount,
  unit = "CR",
  remainingBalance,
  onAnimationComplete,
  variant = "spend",
}: RewardBurstProps) {
  const [particles] = useState(() => generateParticles(16));
  const [showContent, setShowContent] = useState(false);

  // Configure display based on variant
  const isPurchase = variant === "purchase";
  const displaySign = isPurchase ? "+" : "-";
  const headerLabel = isPurchase ? "Credits Earned" : "Credits Spent";
  const balanceLabel = isPurchase ? "New Balance" : "Balance";

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
      onAnimationComplete?.();
    }, 400);
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <div className="relative">
      {/* Particle burst container */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {particles.map(particle => (
          <BurstParticle key={particle.id} {...particle} />
        ))}
        <SparkleTrail />

        {/* Central flash */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(circle, ${colors.reward.glow} 0%, transparent 70%)`,
          }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 1.5, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Reward card with glow */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
          delay: 0.2,
        }}
        className="relative"
      >
        {/* Pulsing glow effect - yellow-500 based */}
        <motion.div
          className="absolute -inset-2 rounded-3xl blur-xl"
          style={{
            background: `linear-gradient(135deg, ${colors.reward.glow} 0%, ${colors.reward.bg} 100%)`,
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Card content */}
        <div
          className="relative px-10 py-5 rounded-2xl border"
          style={{
            backgroundColor: colors.reward.bg,
            borderColor: colors.reward.border,
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Header with sparkles */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 mb-2"
              >
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: colors.reward.primary }} />
                </motion.div>
                <span
                  className="text-xs font-bold font-sans uppercase tracking-widest"
                  style={{ color: colors.reward.primary }}
                >
                  {headerLabel}
                </span>
                <motion.div
                  animate={{ rotate: [0, -15, 15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: colors.reward.primary }} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Large reward amount - yellow-500 gradient */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.1, 1], opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 15,
              delay: 0.3,
            }}
            className="flex items-baseline justify-center gap-2"
          >
            <span
              className="text-5xl font-black font-sans tabular-nums"
              style={{
                background: colors.reward.gradient,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: `drop-shadow(0 0 20px ${colors.reward.glow})`,
              }}
            >
              {displaySign}
              {amount}
            </span>
            <span
              className="text-2xl font-bold font-sans"
              style={{
                background: `linear-gradient(135deg, ${colors.reward.primary} 0%, ${colors.reward.light} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {unit}
            </span>
          </motion.div>

          {/* Remaining balance */}
          <AnimatePresence>
            {showContent && remainingBalance !== null && remainingBalance !== undefined && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-xs font-sans mt-3"
                style={{ color: colors.text.secondary }}
              >
                {balanceLabel}: {remainingBalance} {unit}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

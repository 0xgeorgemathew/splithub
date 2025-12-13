"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { ChevronRight, Circle, Crosshair, Gamepad2, Wind } from "lucide-react";

interface VenueCardProps {
  name: string;
  status?: "online" | "offline" | "ready";
  onClick: () => void;
}

// Arena icons representing different game activities
const ARENA_ICONS = [Gamepad2, Crosshair, Circle, Wind] as const;

// Timing configuration for the ambient loop
const ICON_CYCLE = {
  restDuration: 2400, // Time icon stays fully visible
  transitionDuration: 600, // Fade/scale transition time
};

// Animation variants for the cross-morph illusion
const iconVariants = {
  enter: {
    opacity: 0,
    scale: 0.85,
    rotate: -6,
    y: 3,
  },
  center: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    y: 0,
    transition: {
      duration: ICON_CYCLE.transitionDuration / 1000,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    rotate: 6,
    y: -2,
    transition: {
      duration: ICON_CYCLE.transitionDuration / 1000,
      ease: [0.4, 0, 0.6, 1],
    },
  },
};

// Hover state - subtle accentuation
const hoverVariants = {
  center: {
    opacity: 1,
    scale: 1.05,
    rotate: 0,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// Reduced motion variants - no transform animations
const reducedMotionVariants = {
  enter: { opacity: 0 },
  center: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3 },
  },
};

// Ambient glow pulse - synced to icon cycle
const glowPulseVariants = {
  idle: {
    opacity: [0.15, 0.3, 0.15],
    scale: [1, 1.1, 1],
    transition: {
      duration: (ICON_CYCLE.restDuration + ICON_CYCLE.transitionDuration) / 1000,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  hovered: {
    opacity: 0.45,
    scale: 1.15,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

// Subtle light sweep effect
const sweepVariants = {
  idle: {
    x: ["-100%", "100%"],
    transition: {
      duration: ((ICON_CYCLE.restDuration + ICON_CYCLE.transitionDuration) * 2) / 1000,
      repeat: Infinity,
      ease: "linear",
    },
  },
  hovered: {
    x: "100%",
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

interface ArenaIconProps {
  isHovered: boolean;
}

function ArenaIcon({ isHovered }: ArenaIconProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (isHovered) return; // Pause cycling on hover

    const totalCycleTime = ICON_CYCLE.restDuration + ICON_CYCLE.transitionDuration;
    // Slow down cycle for reduced motion
    const adjustedTime = prefersReducedMotion ? totalCycleTime * 1.5 : totalCycleTime;

    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % ARENA_ICONS.length);
    }, adjustedTime);

    return () => clearInterval(interval);
  }, [isHovered, prefersReducedMotion]);

  const CurrentIcon = ARENA_ICONS[activeIndex];

  // Select appropriate variants based on motion preference
  const getIconVariants = () => {
    if (prefersReducedMotion) return reducedMotionVariants;
    if (isHovered) return hoverVariants;
    return iconVariants;
  };

  return (
    <div className="relative h-10 w-10">
      {/* Ambient radial glow - arena atmosphere */}
      {!prefersReducedMotion && (
        <motion.div
          className="pointer-events-none absolute inset-[-8px] rounded-full"
          style={{
            background: "radial-gradient(circle, var(--venue-accent-glow) 0%, transparent 70%)",
          }}
          variants={glowPulseVariants}
          animate={isHovered ? "hovered" : "idle"}
        />
      )}

      {/* Subtle light sweep - secondary atmosphere */}
      {!prefersReducedMotion && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
          <motion.div
            className="absolute inset-y-0 w-1/3 opacity-[0.07]"
            style={{
              background: "linear-gradient(90deg, transparent, var(--venue-accent), transparent)",
            }}
            variants={sweepVariants}
            animate={isHovered ? "hovered" : "idle"}
          />
        </div>
      )}

      {/* Icon stage */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          variants={getIconVariants()}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 flex items-center justify-center"
        >
          <CurrentIcon
            className="h-10 w-10 text-[var(--venue-text-muted)] transition-colors duration-300 group-hover:text-[var(--venue-accent)] group-hover:[filter:drop-shadow(0_0_8px_var(--venue-accent-glow))]"
            strokeWidth={1.5}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const statusConfig = {
  online: { label: "ONLINE", color: "text-[var(--venue-accent)]" },
  offline: { label: "OFFLINE", color: "text-red-500" },
  ready: { label: "READY", color: "text-[var(--venue-accent)]" },
};

const SPRING_CONFIG = { stiffness: 400, damping: 25 };

export function VenueCard({ name, status = "ready", onClick }: VenueCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Spotlight effect - tracks touch/mouse position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handlePointerMove = (e: React.PointerEvent) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  // Smooth spotlight movement
  const smoothX = useSpring(mouseX, SPRING_CONFIG);
  const smoothY = useSpring(mouseY, SPRING_CONFIG);

  const spotlightStyle = useMotionTemplate`
    radial-gradient(
      300px circle at ${smoothX}px ${smoothY}px,
      var(--venue-accent-glow) 0%,
      transparent 70%
    )
  `;

  const { label, color } = statusConfig[status];

  return (
    <motion.button
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative w-full overflow-hidden rounded-2xl text-left touch-manipulation"
      style={{
        boxShadow: "var(--venue-halo)",
      }}
      whileHover={{ scale: 1.02, boxShadow: "var(--venue-halo-hover)" }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING_CONFIG}
    >
      {/* Ambient glow backdrop */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-30 transition-opacity duration-300 group-hover:opacity-60"
        style={{
          background: "radial-gradient(circle, var(--venue-accent-glow) 0%, transparent 70%)",
          filter: "blur(48px)",
        }}
      />

      {/* Card surface with gradient */}
      <div
        className="relative rounded-2xl border border-white/10 p-6 transition-colors duration-300 group-hover:border-[var(--venue-border-hover)]"
        style={{
          background: "var(--venue-surface-gradient)",
        }}
      >
        {/* Spotlight overlay - follows pointer */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-30"
          style={{ background: spotlightStyle }}
        />

        <div className="relative flex items-center gap-5">
          {/* Icon container - arena stage */}
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-white/10 transition-all duration-300 group-hover:border-[var(--venue-accent)]/30"
            style={{
              background: "linear-gradient(145deg, #252525 0%, #1a1a1a 100%)",
            }}
          >
            <ArenaIcon isHovered={isHovered} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <h3 className="font-bricolage text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{name}</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`font-jetbrains text-xs font-medium tracking-widest ${color}`}>
                <span className="inline-block animate-pulse">{"// "}</span>
                {label}
              </span>
            </div>
          </div>

          {/* Chevron indicator */}
          <ChevronRight
            className="h-6 w-6 text-[var(--venue-text-muted)] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--venue-accent)]"
            strokeWidth={2}
          />
        </div>
      </div>
    </motion.button>
  );
}

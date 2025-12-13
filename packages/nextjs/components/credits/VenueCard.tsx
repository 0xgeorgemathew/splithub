"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { ChevronRight, Circle, Crosshair, Gamepad2, LucideIcon, Wind } from "lucide-react";

interface VenueCardProps {
  name: string;
  status?: "online" | "offline" | "ready";
  onClick: () => void;
}

// =============================================================================
// ARENA ICON SYSTEM
// =============================================================================

// Semantic icon roles:
// Gamepad2: Arena Core - neutral anchor
// Crosshair: Laser Tag - precision, targeting
// Circle: Bowling/Air Hockey - surface, arena floor
// Wind: Motion/Energy - speed, action
const ARENA_ICONS: readonly LucideIcon[] = [Gamepad2, Crosshair, Circle, Wind];
type IconRole = "gamepad" | "crosshair" | "circle" | "wind";
const ICON_ROLES: readonly IconRole[] = ["gamepad", "crosshair", "circle", "wind"];

// Timing
const TIMING = {
  cycleDuration: 2800, // Total time per icon
  transitionDuration: 0.5, // Crossfade duration
};

// =============================================================================
// ARENA ICON COMPONENT
// =============================================================================

interface ArenaIconProps {
  isHovered: boolean;
}

function ArenaIcon({ isHovered }: ArenaIconProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % ARENA_ICONS.length);
    }, TIMING.cycleDuration);
    return () => clearInterval(interval);
  }, [isHovered]);

  const CurrentIcon = ARENA_ICONS[activeIndex];
  const currentRole = ICON_ROLES[activeIndex];

  return (
    <div className="relative h-10 w-10">
      {/* Ambient glow - pulses gently, intensifies on transition */}
      {!prefersReducedMotion && (
        <motion.div
          className="pointer-events-none absolute inset-[-6px] rounded-full"
          style={{
            background: "radial-gradient(circle, var(--venue-accent-glow) 0%, transparent 70%)",
          }}
          animate={{
            opacity: isHovered ? 0.5 : [0.15, 0.25, 0.15],
            scale: isHovered ? 1.1 : [1, 1.05, 1],
          }}
          transition={{
            duration: isHovered ? 0.3 : 2.5,
            ease: "easeInOut",
            repeat: isHovered ? 0 : Infinity,
          }}
        />
      )}

      {/* Per-icon personality effects */}
      {!prefersReducedMotion && !isHovered && (
        <>
          {/* Crosshair: Targeting reticle pulse */}
          {currentRole === "crosshair" && (
            <>
              <motion.div
                className="pointer-events-none absolute inset-[-2px] rounded-full border-2 border-[var(--venue-accent)]"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.3, 0], scale: [0.5, 1.2, 1.4] }}
                transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity, repeatDelay: 0.4 }}
              />
              <motion.div
                className="pointer-events-none absolute inset-[6px] rounded-full border border-[var(--venue-accent)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.15, 0.4] }}
                transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
              />
            </>
          )}

          {/* Circle: Floor/surface glow */}
          {currentRole === "circle" && (
            <motion.div
              className="pointer-events-none absolute inset-[-4px] rounded-full"
              style={{
                background: "radial-gradient(ellipse 100% 60% at center 60%, var(--venue-accent) 0%, transparent 70%)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
            />
          )}

          {/* Wind: Motion streaks */}
          {currentRole === "wind" && (
            <div className="pointer-events-none absolute inset-[-4px] overflow-hidden rounded-full">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="absolute h-[2px] w-3 rounded-full bg-[var(--venue-accent)]"
                  style={{ top: `${30 + i * 20}%`, left: 0 }}
                  initial={{ x: -12, opacity: 0 }}
                  animate={{ x: [-12, 48], opacity: [0, 0.4, 0] }}
                  transition={{
                    duration: 0.8,
                    ease: "easeOut",
                    repeat: Infinity,
                    repeatDelay: 0.6,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>
          )}

          {/* Gamepad: Subtle button pulse */}
          {currentRole === "gamepad" && (
            <motion.div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.15, 0] }}
              transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--venue-accent)", filter: "blur(2px)" }}
              />
            </motion.div>
          )}
        </>
      )}

      {/* Icon stage - smooth crossfade with vertical motion */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.92 }}
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : {
                  opacity: 1,
                  y: 0,
                  scale: isHovered ? 1.08 : 1,
                  transition: {
                    duration: TIMING.transitionDuration,
                    ease: [0.23, 1, 0.32, 1], // easeOutQuint
                  },
                }
          }
          exit={
            prefersReducedMotion
              ? { opacity: 0, transition: { duration: 0.2 } }
              : {
                  opacity: 0,
                  y: -4,
                  scale: 0.95,
                  transition: {
                    duration: TIMING.transitionDuration * 0.7,
                    ease: [0.4, 0, 1, 1],
                  },
                }
          }
          className="absolute inset-0 flex items-center justify-center"
        >
          {/* Breathing wrapper - visible idle motion */}
          <motion.div
            animate={prefersReducedMotion || isHovered ? { scale: 1 } : { scale: [1, 1.04, 1] }}
            transition={
              prefersReducedMotion || isHovered ? undefined : { duration: 2.2, ease: "easeInOut", repeat: Infinity }
            }
          >
            <CurrentIcon
              className="h-10 w-10 text-[var(--venue-text-muted)] transition-colors duration-300 group-hover:text-[var(--venue-accent)] group-hover:[filter:drop-shadow(0_0_8px_var(--venue-accent-glow))]"
              strokeWidth={1.5}
            />
          </motion.div>
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

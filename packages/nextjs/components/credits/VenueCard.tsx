"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, LucideIcon } from "lucide-react";

interface VenueCardProps {
  name: string;
  status?: "online" | "offline" | "ready";
  icon: LucideIcon;
  onClick: () => void;
}

export function VenueCard({ name, status = "ready", icon: Icon, onClick }: VenueCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  const statusConfig = {
    online: { label: "ONLINE", color: "text-[var(--venue-accent)]" },
    offline: { label: "OFFLINE", color: "text-red-500" },
    ready: { label: "READY", color: "text-[var(--venue-accent)]" },
  };

  const { label, color } = statusConfig[status];

  const handleTap = async () => {
    setIsPressed(true);
    // Wait for press-down + flash animation
    await new Promise(resolve => setTimeout(resolve, 300));
    onClick();
    // Reset after a brief delay
    setTimeout(() => setIsPressed(false), 100);
  };

  return (
    <motion.button
      onClick={handleTap}
      className="group relative w-full overflow-hidden rounded-2xl text-left"
      initial={{ boxShadow: "var(--venue-halo)" }}
      whileHover={{
        scale: 1.03,
        y: -5,
        boxShadow: "var(--venue-halo-hover)",
      }}
      animate={isPressed ? { scale: 0.95, y: 0 } : { scale: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
    >
      {/* Ambient glow backdrop */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
        style={{
          background: "radial-gradient(circle, var(--venue-accent-glow) 0%, transparent 70%)",
        }}
      />

      {/* Flash overlay on press */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 rounded-2xl"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isPressed ? 1 : 0,
          background: isPressed
            ? "linear-gradient(145deg, rgba(255,255,255,0.4) 0%, rgba(242,169,0,0.3) 100%)"
            : "transparent",
        }}
        transition={{ duration: 0.15 }}
      />

      {/* Card surface with gradient */}
      <div
        className="relative rounded-2xl border border-white/10 p-6 transition-colors duration-300 group-hover:border-[var(--venue-border-hover)]"
        style={{
          background: "var(--venue-surface-gradient)",
        }}
      >
        <div className="relative flex items-center gap-5">
          {/* Icon container - Game Cartridge style */}
          <motion.div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-white/10 transition-all duration-300 group-hover:border-[var(--venue-accent)]/30"
            style={{
              background: "linear-gradient(145deg, #252525 0%, #1a1a1a 100%)",
            }}
            whileHover={{
              boxShadow: "0 0 25px -5px var(--venue-accent-glow)",
            }}
          >
            <Icon
              className="venue-icon h-10 w-10 text-[var(--venue-text-muted)] transition-all duration-300 group-hover:text-[var(--venue-accent)] group-hover:[filter:drop-shadow(0_0_8px_var(--venue-accent-glow))]"
              strokeWidth={1.5}
            />
          </motion.div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <h3 className="font-bricolage text-2xl font-extrabold tracking-tight text-[var(--venue-text)] sm:text-3xl">
              {name}
            </h3>
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

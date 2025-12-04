"use client";

import { AnimatePresence, motion } from "framer-motion";

interface WristbandIconProps {
  credits: number;
  isGlowing?: boolean;
  isBurning?: boolean;
  size?: "sm" | "md" | "lg";
}

export function WristbandIcon({ credits, isGlowing = false, isBurning = false, size = "md" }: WristbandIconProps) {
  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-28 h-28",
    lg: "w-36 h-36",
  };

  const bandWidth = {
    sm: 6,
    md: 8,
    lg: 10,
  };

  return (
    <motion.div
      className={`relative ${sizeClasses[size]} flex items-center justify-center`}
      animate={isGlowing ? "glowing" : "idle"}
      variants={{
        idle: { boxShadow: "0 0 10px rgba(242, 169, 0, 0.2)" },
        glowing: {
          boxShadow: [
            "0 0 10px rgba(242, 169, 0, 0.2)",
            "0 0 40px rgba(242, 169, 0, 0.7)",
            "0 0 10px rgba(242, 169, 0, 0.2)",
          ],
        },
      }}
      transition={{ duration: 1.5, repeat: isGlowing ? Infinity : 0, ease: "easeInOut" }}
      style={{ borderRadius: "50%" }}
    >
      {/* Wristband ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: `${bandWidth[size]}px solid #f2a900`,
          background: "linear-gradient(180deg, rgba(242, 169, 0, 0.1) 0%, rgba(242, 169, 0, 0.05) 100%)",
        }}
      />

      {/* Clasp at top */}
      <div
        className="absolute bg-primary rounded"
        style={{
          top: -4,
          left: "50%",
          transform: "translateX(-50%)",
          width: size === "sm" ? 16 : size === "md" ? 20 : 24,
          height: size === "sm" ? 8 : size === "md" ? 10 : 12,
        }}
      />

      {/* Burning effect - dissolving token with rising particles inside circle */}
      <AnimatePresence>
        {isBurning && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
            {/* Pulsing orange glow ring - starts first */}
            <motion.div
              className="absolute inset-2 rounded-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.6, 0.4, 0.2, 0], scale: [0.8, 1, 1.05, 1, 0.95] }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              style={{
                background: "radial-gradient(circle, rgba(251, 146, 60, 0.5) 0%, transparent 70%)",
              }}
            />

            {/* Central burn glow */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              {/* Burning token */}
              <motion.div
                className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg"
                initial={{ scale: 1, opacity: 1 }}
                animate={{
                  scale: [1, 1.1, 1.3, 1.6, 0],
                  opacity: [1, 1, 0.9, 0.6, 0],
                  filter: ["brightness(1)", "brightness(1.2)", "brightness(1.4)", "brightness(1.8)", "brightness(2)"],
                }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.div>

            {/* Rising particles - staggered for smoother effect */}
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={`burn-particle-${i}`}
                className="absolute rounded-full"
                style={{
                  left: `${35 + ((i % 5) - 2) * 8}%`,
                  top: "55%",
                  width: i < 5 ? 4 : 3,
                  height: i < 5 ? 4 : 3,
                  background: i < 5 ? "#fb923c" : "#fbbf24",
                }}
                initial={{ y: 0, opacity: 0, scale: 0.5 }}
                animate={{
                  y: i < 5 ? -35 : -25,
                  x: ((i % 5) - 2) * 10 + (i >= 5 ? 5 : 0),
                  opacity: [0, 1, 1, 0],
                  scale: [0.5, 1, 0.7, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.9,
                  delay: i * 0.08,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* NFC waves indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <svg
          width={size === "sm" ? 16 : size === "md" ? 20 : 24}
          height={size === "sm" ? 12 : size === "md" ? 16 : 20}
          viewBox="0 0 24 20"
          fill="none"
        >
          <path d="M6 14C7.5 12.5 7.5 10.5 6 9" stroke="#f2a900" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          <path d="M10 16C13 13 13 8 10 5" stroke="#f2a900" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <path d="M14 18C18.5 13.5 18.5 6.5 14 2" stroke="#f2a900" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Credits display */}
      <div className="flex flex-col items-center justify-center z-10">
        <motion.span
          className="font-[family-name:var(--font-bricolage)] font-bold text-primary"
          style={{ fontSize: size === "sm" ? "1rem" : size === "md" ? "1.25rem" : "1.5rem" }}
          key={credits}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {credits}
        </motion.span>
        <span
          className="text-primary/70 font-medium tracking-wide"
          style={{ fontSize: size === "sm" ? "0.45rem" : size === "md" ? "0.5rem" : "0.625rem" }}
        >
          Credits
        </span>
      </div>
    </motion.div>
  );
}

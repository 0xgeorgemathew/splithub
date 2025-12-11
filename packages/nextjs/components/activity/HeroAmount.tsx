"use client";

import { colors } from "./styles";
import { AnimatePresence, motion } from "framer-motion";

interface HeroAmountProps {
  amount: string | number;
  unit?: string;
  label?: string;
  size?: "default" | "compact";
  variant?: "default" | "success" | "dimmed";
}

const sizeConfig = {
  default: {
    amount: "text-5xl",
    unit: "text-xl",
    label: "text-sm",
  },
  compact: {
    amount: "text-3xl",
    unit: "text-base",
    label: "text-xs",
  },
};

// Color configuration using centralized style tokens
const variantConfig = {
  default: {
    amount: colors.text.primary,
    unit: colors.text.muted,
    label: colors.text.disabled,
  },
  success: {
    amount: colors.success.primary,
    unit: colors.success.glow,
    label: `${colors.success.primary}80`, // 50% opacity
  },
  dimmed: {
    amount: "rgba(255, 255, 255, 0.7)",
    unit: colors.text.disabled,
    label: "rgba(255, 255, 255, 0.3)",
  },
};

export function HeroAmount({ amount, unit = "CR", label, size = "default", variant = "default" }: HeroAmountProps) {
  const sizes = sizeConfig[size];
  const colorScheme = variantConfig[variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="text-center"
    >
      {/* Label above amount */}
      <AnimatePresence>
        {label && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`${sizes.label} font-sans font-medium uppercase tracking-wider mb-1`}
            style={{ color: colorScheme.label }}
          >
            {label}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Amount with unit */}
      <div className="flex items-baseline justify-center gap-1.5">
        <motion.span
          layout
          className={`${sizes.amount} font-sans font-bold tabular-nums tracking-tight`}
          style={{ color: colorScheme.amount }}
        >
          {amount}
        </motion.span>
        <motion.span layout className={`${sizes.unit} font-sans font-semibold`} style={{ color: colorScheme.unit }}>
          {unit}
        </motion.span>
      </div>
    </motion.div>
  );
}

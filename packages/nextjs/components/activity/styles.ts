/**
 * Transaction Feedback UI - Style Tokens
 *
 * Typography: Inter/Geist Sans for UI, Monospace only for TX hashes
 * Colors: Dark glassmorphic with green success and yellow rewards
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const colors = {
  // Success state - Checkmarks, "Approved" text, completion indicators
  success: {
    primary: "#22c55e", // Tailwind green-500
    light: "#4ade80", // green-400
    dark: "#16a34a", // green-600
    glow: "rgba(34, 197, 94, 0.4)",
    bg: "rgba(34, 197, 94, 0.15)",
    border: "rgba(34, 197, 94, 0.3)",
  },

  // Processing/Active state - Spinners, active indicators
  processing: {
    primary: "#3b82f6", // Tailwind blue-500
    light: "#60a5fa", // blue-400
    glow: "rgba(59, 130, 246, 0.4)",
    bg: "rgba(59, 130, 246, 0.15)",
  },

  // Reward/Credits - The dopamine yellow/gold
  reward: {
    primary: "#eab308", // Tailwind yellow-500
    light: "#facc15", // yellow-400
    gold: "#fbbf24", // amber-400
    glow: "rgba(234, 179, 8, 0.5)",
    bg: "rgba(234, 179, 8, 0.15)",
    border: "rgba(234, 179, 8, 0.4)",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #eab308 50%, #facc15 100%)",
  },

  // Error state
  error: {
    primary: "#ef4444", // Tailwind red-500
    light: "#f87171", // red-400
    glow: "rgba(239, 68, 68, 0.4)",
    bg: "rgba(239, 68, 68, 0.15)",
    border: "rgba(239, 68, 68, 0.3)",
  },

  // Text colors
  text: {
    primary: "#ffffff", // White - main text
    secondary: "#9ca3af", // Gray-400 - dates, details
    tertiary: "#6b7280", // Gray-500 - very subtle text
    muted: "rgba(255, 255, 255, 0.5)", // Semi-transparent white
    disabled: "rgba(255, 255, 255, 0.3)",
  },

  // Background/Surface colors (glassmorphic)
  surface: {
    card: "rgba(30, 30, 35, 0.9)",
    cardBorder: "rgba(255, 255, 255, 0.08)",
    elevated: "rgba(40, 40, 45, 0.8)",
    overlay: "rgba(0, 0, 0, 0.6)",
    glass: "rgba(255, 255, 255, 0.03)",
  },

  // Pending/Inactive state
  pending: {
    primary: "#6b7280", // Gray-500
    light: "#9ca3af", // Gray-400
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Font families
  fontFamily: {
    // UI text - clean, modern sans-serif
    sans: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    // Monospace - ONLY for TX hashes
    mono: "'SF Mono', 'Fira Code', 'Consolas', monospace",
  },

  // Font sizes (following mobile-first scale)
  fontSize: {
    xs: "0.75rem", // 12px - TX hash, timestamps
    sm: "0.875rem", // 14px - Step labels, descriptions
    base: "1rem", // 16px - Body text
    lg: "1.125rem", // 18px - Subtitles
    xl: "1.25rem", // 20px - Card titles
    "2xl": "1.5rem", // 24px - Success titles
    "3xl": "1.875rem", // 30px - Compact amounts
    "4xl": "2.25rem", // 36px - Large amounts
    "5xl": "3rem", // 48px - Hero amounts
  },

  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  },

  // Line heights
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },

  // Letter spacing
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
} as const;

// =============================================================================
// SHADOWS & EFFECTS
// =============================================================================

export const effects = {
  // Glow effects
  glow: {
    success: `0 0 40px ${colors.success.glow}`,
    reward: `0 0 40px ${colors.reward.glow}`,
    processing: `0 0 30px ${colors.processing.glow}`,
    error: `0 0 30px ${colors.error.glow}`,
  },

  // Card shadows
  shadow: {
    card: "0 8px 32px rgba(0, 0, 0, 0.4)",
    elevated: "0 16px 48px rgba(0, 0, 0, 0.5)",
    button: "0 4px 16px rgba(0, 0, 0, 0.3)",
  },

  // Backdrop blur
  blur: {
    sm: "8px",
    md: "16px",
    lg: "24px",
  },

  // Border radius
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    "2xl": "24px",
    full: "9999px",
  },
} as const;

// =============================================================================
// CSS CLASSES (Tailwind-compatible)
// =============================================================================

export const classes = {
  // Text styles
  text: {
    // Primary white text
    primary: "text-white",
    // Secondary gray text for details
    secondary: "text-gray-400",
    // Muted text
    muted: "text-white/50",
    // Success text
    success: "text-green-500",
    // Reward/credits text
    reward: "text-yellow-500",
    // Error text
    error: "text-red-500",
    // Processing text
    processing: "text-blue-500",
  },

  // Font family classes
  font: {
    // Sans-serif for all UI text
    sans: "font-sans",
    // Monospace ONLY for TX hashes
    mono: "font-mono",
  },

  // Card/surface backgrounds
  surface: {
    card: "bg-[rgba(30,30,35,0.9)] backdrop-blur-xl border border-white/[0.08]",
    glass: "bg-white/[0.03]",
    elevated: "bg-[rgba(40,40,45,0.8)]",
  },
} as const;

// =============================================================================
// COMPONENT-SPECIFIC STYLES
// =============================================================================

export const componentStyles = {
  // Transaction hash (the ONLY place for monospace)
  txHash: {
    className: "font-mono text-xs text-gray-400",
    style: {
      fontFamily: typography.fontFamily.mono,
      fontSize: typography.fontSize.xs,
      color: colors.text.secondary,
    },
  },

  // Step label text
  stepLabel: {
    className: "font-sans text-sm font-medium",
    style: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
    },
  },

  // Card title
  cardTitle: {
    className: "font-sans text-lg font-semibold text-white",
    style: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text.primary,
    },
  },

  // Success title
  successTitle: {
    className: "font-sans text-2xl font-bold text-white",
    style: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize["2xl"],
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
    },
  },

  // Reward amount (large yellow number)
  rewardAmount: {
    className: "font-sans text-5xl font-black tabular-nums",
    style: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize["5xl"],
      fontWeight: typography.fontWeight.black,
      background: colors.reward.gradient,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      filter: `drop-shadow(0 0 20px ${colors.reward.glow})`,
    },
  },

  // Secondary details (dates, balance info)
  detail: {
    className: "font-sans text-xs text-gray-400",
    style: {
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.xs,
      color: colors.text.secondary,
    },
  },
} as const;

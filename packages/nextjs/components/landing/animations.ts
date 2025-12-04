// Shared Framer Motion animation variants for landing page

export const transition = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const fastTransition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1] as const,
};

// Card slide-in from left (for friends balance cards)
export const cardSlideInVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { ...transition, delay: i * 0.15 },
  }),
};

// Tab content cross-fade
export const tabContentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

// Pulse selection effect for selected card
export const pulseVariants = {
  idle: { scale: 1, boxShadow: "0 0 0 rgba(242, 169, 0, 0)" },
  selected: {
    scale: [1, 1.02, 1],
    boxShadow: ["0 0 0 rgba(242, 169, 0, 0)", "0 0 20px rgba(242, 169, 0, 0.4)", "0 0 0 rgba(242, 169, 0, 0)"],
    transition: { duration: 1.5, repeat: Infinity },
  },
};

// Wristband glow effect
export const wristbandGlowVariants = {
  idle: { boxShadow: "0 0 10px rgba(242, 169, 0, 0.2)" },
  glowing: {
    boxShadow: [
      "0 0 10px rgba(242, 169, 0, 0.2)",
      "0 0 30px rgba(242, 169, 0, 0.6)",
      "0 0 10px rgba(242, 169, 0, 0.2)",
    ],
    transition: { duration: 1.5, repeat: Infinity },
  },
};

// Credits counter bump
export const counterBumpVariants = {
  initial: { scale: 1 },
  bump: { scale: [1, 1.2, 1], transition: { duration: 0.3 } },
};

// Staggered container for children
export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// Fade up for feature cards
export const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition,
  },
};

// Scale in for icons
export const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition,
  },
};

// Balance settle color transition (red → gold → green)
export const settleColorVariants = {
  owing: { color: "#FF6A4A" },
  settling: { color: "#f2a900", transition: { duration: 0.3 } },
  settled: { color: "#22c55e", transition: { duration: 0.3 } },
};

// Checkmark draw animation
export const checkmarkVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// NFC approach animation (for wristband moving toward terminal)
export const approachVariants = {
  idle: { x: 0 },
  approaching: {
    x: [0, 30, 30, 0],
    transition: {
      duration: 2,
      times: [0, 0.3, 0.7, 1],
      repeat: Infinity,
      repeatDelay: 6,
    },
  },
};

// Activity unlock glow
export const unlockVariants = {
  locked: { opacity: 0.5, filter: "grayscale(1)" },
  unlocked: {
    opacity: 1,
    filter: "grayscale(0)",
    transition: { duration: 0.4 },
  },
};

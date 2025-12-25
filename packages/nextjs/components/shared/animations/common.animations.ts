/**
 * Shared Framer Motion animation variants
 * Used across modals, lists, and other animated components
 */
import type { Variants } from "framer-motion";

/**
 * Container variant for staggered child animations
 */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

/**
 * Individual item variant for staggered animations
 */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 50 },
  },
};

/**
 * List item variant with scale animation
 */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 40 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -5,
    transition: { duration: 0.15 },
  },
};

/**
 * Icon rotation animation variants
 */
export const iconVariants: Variants = {
  initial: { scale: 0, opacity: 0, rotate: -180 },
  animate: { scale: 1, opacity: 1, rotate: 0 },
  exit: { scale: 0, opacity: 0, rotate: 180 },
};

/**
 * Modal backdrop animation
 */
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Modal container animation
 */
export const modalContainer: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  show: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: -20 },
};

/**
 * Fade in/out animation
 */
export const fadeInOut: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Slide up animation for items entering from bottom
 */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

/**
 * Scale pop animation for success indicators
 */
export const scalePop: Variants = {
  hidden: { scale: 0 },
  show: {
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 20 },
  },
  exit: { scale: 0 },
};

/**
 * Spring transition configuration for interactive elements
 */
export const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

/**
 * Default duration for simple transitions
 */
export const defaultTransition = {
  duration: 0.2,
  ease: "easeInOut" as const,
};

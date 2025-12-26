/**
 * Application Constants - Centralized magic numbers and configuration values
 *
 * This file contains constants that were previously hardcoded in components.
 * Each constant includes a comment explaining WHY the value was chosen.
 */

// =============================================================================
// TOKEN AMOUNTS
// =============================================================================

/**
 * Default approval amount in token units (not wei)
 * 1000 USDC is sufficient for approximately 100 typical transactions ($10 avg)
 * This provides a good balance between security and convenience
 */
export const DEFAULT_APPROVAL_AMOUNT = "1000";

// =============================================================================
// NFC TIMING (in milliseconds)
// =============================================================================

/**
 * Minimum delay between NFC chip taps
 * Hardware requires ~300ms to reset for subsequent reads
 * Attempting faster reads can result in failed or duplicate reads
 */
export const NFC_TAP_COOLDOWN_MS = 300;

/**
 * Minimum display time for the onboarding finalizer loader
 * Ensures users see feedback even if the API responds instantly
 * Prevents jarring flash of content for fast connections
 */
export const ONBOARDING_MIN_DISPLAY_MS = 1200;

/**
 * Delay before redirecting after successful approval
 * Allows users to see the success state before navigation
 */
export const APPROVAL_SUCCESS_REDIRECT_DELAY_MS = 600;

// =============================================================================
// SIGNATURE CONFIGURATION
// =============================================================================

/**
 * Signature validity duration in seconds
 * 1 hour provides enough time for slow transactions while limiting replay window
 */
export const SIGNATURE_VALIDITY_SECONDS = 3600;

// =============================================================================
// ANIMATION CONFIGURATIONS
// =============================================================================

/**
 * Spring configurations for framer-motion animations
 * Tuned for 120fps displays with smooth, natural motion
 */
export const SPRING_CONFIGS = {
  /**
   * Gentle spring for success animations
   * Lower stiffness = slower, more fluid motion
   * Higher damping = less oscillation at end
   */
  gentle: { type: "spring" as const, stiffness: 120, friction: 14 },

  /**
   * Bouncy spring for attention-grabbing states
   * High tension creates snappy, energetic feel
   */
  bouncy: { type: "spring" as const, stiffness: 300, friction: 10 },

  /**
   * Smooth spring for general transitions
   * Balanced values for natural feel without being sluggish
   */
  smooth: { type: "spring" as const, stiffness: 180, friction: 12 },

  /**
   * Terminal spring - buttery smooth for POS terminal animations
   * Optimized for slide-up animations on 120fps displays
   */
  terminal: { type: "spring" as const, stiffness: 260, damping: 32, mass: 1 },

  /**
   * View spring - faster transitions for view changes inside terminal
   */
  view: { type: "spring" as const, stiffness: 400, damping: 35, mass: 0.8 },

  /**
   * Nav spring - for navigation bar entrance
   */
  nav: { type: "spring" as const, stiffness: 260, damping: 25 },
} as const;

/**
 * Tween configurations for non-spring animations
 * Used where pure opacity or linear motion is preferred
 */
export const TWEEN_CONFIGS = {
  /**
   * Backdrop fade - pure opacity for maximum smoothness
   * easeOutQuart curve for natural deceleration
   */
  backdrop: {
    type: "tween" as const,
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1],
  },

  /**
   * Icon transition - quick and snappy
   */
  icon: {
    duration: 0.2,
    ease: "easeInOut" as const,
  },
} as const;

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

/**
 * Scale variants for purchase <-> purchasing transitions in POS
 * Subtle scale changes create depth without being distracting
 */
export const SCALE_VARIANTS = {
  enter: { opacity: 0, scale: 1.02 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
} as const;

/**
 * Slide variants for directional transitions
 */
export const SLIDE_VARIANTS = {
  left: {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  right: {
    enter: { opacity: 0, x: -20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
} as const;

/**
 * Icon animation variants for state transitions (e.g., payment request icons)
 */
export const ICON_VARIANTS = {
  initial: { scale: 0, opacity: 0, rotate: -180 },
  animate: { scale: 1, opacity: 1, rotate: 0 },
  exit: { scale: 0, opacity: 0, rotate: 180 },
} as const;

/**
 * Shake animation keyframes for error/blocked states
 * Horizontal shake with decreasing amplitude for natural damping effect
 * Used for:
 * - POS terminal dismissal blocking (when transaction in progress)
 * - Hardware frame error state feedback
 */
export const SHAKE_ANIMATION = {
  x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0] as number[],
};

/**
 * Shake transition configuration
 * Fast duration with easeOut for immediate, urgent feedback
 */
export const SHAKE_TRANSITION = {
  duration: 0.5,
  ease: "easeOut" as const,
};

// =============================================================================
// HAPTIC FEEDBACK PATTERNS
// =============================================================================

/**
 * Haptic pattern for blocked dismissal feedback
 * Double-tap pattern: vibrate 50ms, pause 30ms, vibrate 50ms
 * Provides urgent but non-aggressive feedback when user tries invalid action
 */
export const HAPTIC_BLOCKED_DISMISSAL = [50, 30, 50] as const;

/**
 * Single haptic pulse for success feedback
 */
export const HAPTIC_SUCCESS = 50 as const;

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

/**
 * Base Sepolia Chain ID
 * Used for EIP-712 signature domain verification
 * This ensures signatures are only valid on the intended chain
 */
export const BASE_SEPOLIA_CHAIN_ID = 84532 as const;

// =============================================================================
// DATABASE RETRY CONFIGURATION
// =============================================================================

/**
 * Maximum retry attempts for critical database operations
 * 3 attempts balances reliability with avoiding excessive API calls
 * Prevents infinite loops while handling transient failures
 */
export const DB_UPDATE_MAX_RETRIES = 3 as const;

/**
 * Base delay between retry attempts in milliseconds
 * Uses exponential backoff: attempt N waits N * BASE_DELAY
 * Allows temporary issues to resolve before retry
 */
export const DB_UPDATE_RETRY_DELAY_MS = 1000 as const;

// =============================================================================
// STATE RESET TIMING
// =============================================================================

/**
 * Delay before resetting state after transition completion
 * Allows exit animations to complete smoothly before state clears
 * Prevents jarring visual glitches during success flows
 */
export const STATE_RESET_DELAY_MS = 150 as const;

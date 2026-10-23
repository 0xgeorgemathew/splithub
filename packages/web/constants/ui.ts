/**
 * UI Constants - Centralized magic numbers and configuration values
 */

/**
 * Animation timing delays in milliseconds
 */
export const ANIMATION_DELAYS = {
  /** Duration to show success state before auto-closing */
  SUCCESS_DISPLAY: 1500,
  /** Delay before refreshing data after settlement */
  SETTLEMENT_REFRESH: 500,
} as const;

/**
 * Balance calculation thresholds
 */
export const BALANCE_THRESHOLDS = {
  /** Minimum amount to display (filters out dust amounts) */
  MIN_DISPLAY_AMOUNT: 0.01,
} as const;

/**
 * Avatar size ratios for circle collage layouts
 */
export const AVATAR_SIZE_RATIOS = {
  /** Ratio for 2 member circles */
  TWO_MEMBERS: 0.55,
  /** Ratio for 3 member circles */
  THREE_MEMBERS: 0.48,
  /** Ratio for 4+ member circles */
  FOUR_PLUS_MEMBERS: 0.45,
} as const;

/**
 * Grid layout dimensions
 */
export const GRID_LAYOUTS = {
  /** Width of the amount column in balance items */
  BALANCE_ITEM_AMOUNT_WIDTH: "80px",
  /** Width of the icon column in balance items */
  BALANCE_ITEM_ICON_WIDTH: "32px",
} as const;

/**
 * Circle collage positioning values
 */
export const CIRCLE_POSITIONS = {
  /** Offset ratio from edge for triangle layout */
  TRIANGLE_OFFSET: 0.08,
  /** Overlap ratio for stacked fan arrangement */
  FAN_OVERLAP: 0.5,
  /** Rotation increment for fan arrangement */
  FAN_ROTATION_DEG: 5,
} as const;

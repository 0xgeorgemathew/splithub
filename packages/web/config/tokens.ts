/**
 * Token Configuration
 *
 * Centralized configuration for token addresses used across the application.
 * Edit this file to change token addresses for different networks or deployments.
 */

export const TOKENS = {
  /**
   * USDC Token Address on Base Sepolia
   * Used for:
   * - Payments between users (tap-to-pay)
   * - Credit token purchases (USDC → Credits)
   * - Expense splitting
   * - Settlement flows
   */
  USDC: "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a" as const,

  /**
   * USDC decimals (standard for USDC is 6)
   */
  USDC_DECIMALS: 6,
} as const;

/**
 * Token decimal configurations
 */
export const TOKEN_DECIMALS = {
  USDC: 6,
  CREDIT: 18,
} as const;

/**
 * Credit token conversion rates
 */
export const CREDIT_CONVERSION = {
  /** 1 USDC = 10 credits */
  USDC_TO_CREDITS_RATIO: 10,
} as const;

/**
 * Payment request configuration
 */
export const PAYMENT_REQUEST_CONFIG = {
  /** Hours until payment request expires */
  EXPIRY_HOURS: 24,
} as const;

/**
 * Payment signing configuration
 */
export const PAYMENT_DEADLINE = {
  /** Seconds until payment signature expires (1 hour) */
  SECONDS: 3600,
} as const;

/**
 * Default token for payments when no specific token is specified
 */
export const DEFAULT_PAYMENT_TOKEN = TOKENS.USDC;

/**
 * Type for the USDC address (useful for type-safe contract calls)
 */
export type USDCAddress = typeof TOKENS.USDC;

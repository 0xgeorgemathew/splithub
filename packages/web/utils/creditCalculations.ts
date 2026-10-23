/**
 * Credit Calculation Utilities
 *
 * Handles conversion between USDC and credit tokens.
 * USDC has 6 decimals, credits have 18 decimals.
 * 1 USDC = 10 credits
 */
import { CREDIT_CONVERSION, TOKEN_DECIMALS } from "~~/config/tokens";

/**
 * Calculates the amount of credits minted from a USDC amount
 *
 * @param usdcAmount - USDC amount in wei (6 decimals)
 * @returns Credit amount in wei (18 decimals)
 */
export function calculateCreditsMinted(usdcAmount: bigint): bigint {
  const ratio = BigInt(CREDIT_CONVERSION.USDC_TO_CREDITS_RATIO);
  const creditDecimals = BigInt(10 ** TOKEN_DECIMALS.CREDIT);
  const usdcDecimals = BigInt(10 ** TOKEN_DECIMALS.USDC);

  return (usdcAmount * ratio * creditDecimals) / usdcDecimals;
}

/**
 * Calculates the USDC cost for a given amount of credits
 *
 * @param creditAmount - Credit amount in wei (18 decimals)
 * @returns USDC amount in wei (6 decimals)
 */
export function calculateUsdcCost(creditAmount: bigint): bigint {
  const ratio = BigInt(CREDIT_CONVERSION.USDC_TO_CREDITS_RATIO);
  const creditDecimals = BigInt(10 ** TOKEN_DECIMALS.CREDIT);
  const usdcDecimals = BigInt(10 ** TOKEN_DECIMALS.USDC);

  return (creditAmount * usdcDecimals) / (ratio * creditDecimals);
}

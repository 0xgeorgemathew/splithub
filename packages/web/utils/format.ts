/**
 * Formatting utilities for currency and balance display
 */
import { BALANCE_THRESHOLDS } from "~~/constants/ui";

/**
 * Format a number as currency with locale formatting
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 */
export const formatCurrency = (amount: number, decimals: number = 2): string => {
  return Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format a number as a fixed decimal string
 * @param amount - The amount to format
 */
export const formatAmount = (amount: number): string => {
  return Math.abs(amount).toFixed(2);
};

/**
 * Get human-readable balance status text
 * @param balance - The balance amount (positive = owed to you, negative = you owe)
 */
export const getBalanceText = (balance: number): string => {
  if (balance > 0) return "owes you";
  if (balance < 0) return "you owe";
  return "settled up";
};

/**
 * Check if a balance can be settled (user owes money)
 * @param balance - The balance amount
 */
export const canSettle = (balance: number): boolean => {
  return balance < 0;
};

/**
 * Check if a payment can be requested (someone owes user)
 * @param balance - The balance amount
 */
export const canRequestPayment = (balance: number): boolean => {
  return balance > 0;
};

/**
 * Check if a balance is significant enough to display
 * @param balance - The balance amount
 */
export const isSignificantBalance = (balance: number): boolean => {
  return Math.abs(balance) >= BALANCE_THRESHOLDS.MIN_DISPLAY_AMOUNT;
};

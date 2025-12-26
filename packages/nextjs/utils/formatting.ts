/**
 * Formatting Utilities
 *
 * Shared formatting functions for consistent display across the app.
 */

/**
 * Formats a currency amount for display
 *
 * @param amount - The amount to format (can be negative)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with absolute value and specified decimals
 *
 * @example
 * formatCurrencyAmount(123.456) // "123.46"
 * formatCurrencyAmount(-50.5)   // "50.50"
 * formatCurrencyAmount(100, 0)  // "100"
 */
export function formatCurrencyAmount(amount: number, decimals: number = 2): string {
  return Math.abs(amount).toFixed(decimals);
}

/**
 * Formats a balance amount with dollar sign
 *
 * @param amount - The balance amount
 * @returns Formatted string like "$123.45"
 *
 * @example
 * formatBalanceDisplay(50.5)  // "$50.50"
 * formatBalanceDisplay(-25)   // "$25.00"
 */
export function formatBalanceDisplay(amount: number): string {
  return `$${formatCurrencyAmount(amount)}`;
}

/**
 * Formats a number with locale-aware thousands separators
 *
 * @param value - Number to format
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted string with separators
 *
 * @example
 * formatWithSeparators(1234567.89) // "1,234,567.89"
 */
export function formatWithSeparators(value: number, locale: string = "en-US"): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

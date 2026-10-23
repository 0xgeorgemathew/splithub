/**
 * Address Helper Utilities
 *
 * Common functions for working with Ethereum addresses
 * Extracted from UI components for reusability and testability
 */

/**
 * Truncates an Ethereum address for display
 *
 * @param address - Full ethereum address (0x...)
 * @param startLength - Number of characters to show at start (default: 6)
 * @param endLength - Number of characters to show at end (default: 4)
 * @returns Truncated address like "0x1234...abcd"
 *
 * @example
 * truncateAddress("0x1234567890abcdef1234567890abcdef12345678")
 * // Returns: "0x1234...5678"
 *
 * truncateAddress("0x1234567890abcdef1234567890abcdef12345678", 10, 6)
 * // Returns: "0x12345678...345678"
 */
export function truncateAddress(address: string, startLength: number = 6, endLength: number = 4): string {
  if (!address) return "";
  if (address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Copies text to the clipboard and returns success status
 *
 * @param text - Text to copy to clipboard
 * @returns Promise<boolean> - true if successful, false otherwise
 *
 * @example
 * const success = await copyToClipboard("0x1234...");
 * if (success) {
 *   showToast("Copied!");
 * }
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * Validates if a string is a valid Ethereum address
 *
 * @param address - String to validate
 * @returns boolean - true if valid Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Checksums an Ethereum address (converts to proper case)
 * Note: This is a simplified version that just lowercases.
 * For true EIP-55 checksum, use viem's getAddress()
 *
 * @param address - Ethereum address
 * @returns Lowercased address for consistent comparison
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Compares two Ethereum addresses for equality (case-insensitive)
 *
 * @param addr1 - First address
 * @param addr2 - Second address
 * @returns boolean - true if addresses are equal
 */
export function addressesEqual(addr1: string | undefined, addr2: string | undefined): boolean {
  if (!addr1 || !addr2) return false;
  return normalizeAddress(addr1) === normalizeAddress(addr2);
}

/**
 * Error Formatting Utilities
 *
 * Centralizes error message formatting across the application.
 * Provides user-friendly messages with specific guidance for each error type.
 */

/**
 * Extracts the error message from any error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Checks if an error message contains any of the specified keywords
 */
function matchesError(errorMsg: string, ...keywords: string[]): boolean {
  const lowerMsg = errorMsg.toLowerCase();
  return keywords.some(keyword => lowerMsg.includes(keyword.toLowerCase()));
}

/**
 * Formats wallet/transaction errors into user-friendly messages
 *
 * Covers common wallet interactions:
 * - User rejection
 * - Insufficient balance
 * - Network issues
 * - Contract errors
 */
export function formatWalletError(error: unknown): string {
  const errorMsg = getErrorMessage(error);

  // User explicitly rejected the transaction
  if (matchesError(errorMsg, "User rejected", "user denied", "rejected by user")) {
    return "Transaction was cancelled. Please try again when ready.";
  }

  // Insufficient balance for transaction
  if (matchesError(errorMsg, "insufficient", "not enough")) {
    return "Insufficient balance to complete this transaction.";
  }

  // Network connectivity issues
  if (matchesError(errorMsg, "network", "connection", "timeout")) {
    return "Network error. Please check your connection and try again.";
  }

  // ERC-20 allowance issues
  if (matchesError(errorMsg, "allowance", "approve")) {
    return "Token approval required. Please approve the transaction first.";
  }

  // Nonce issues (usually indicates stale state)
  if (matchesError(errorMsg, "nonce", "InvalidNonce")) {
    return "Transaction state out of sync. Please refresh and try again.";
  }

  // Expired signature
  if (matchesError(errorMsg, "expired", "ExpiredSignature", "deadline")) {
    return "Signature expired. Please try again with a fresh signature.";
  }

  // Unauthorized signer (chip not registered)
  if (matchesError(errorMsg, "unauthorized", "UnauthorizedSigner", "not registered")) {
    return "Chip not registered. Please register your chip first.";
  }

  // Already registered error
  if (matchesError(errorMsg, "already registered", "AlreadyRegistered")) {
    return "This chip is already registered to another account.";
  }

  // Gas estimation failed (often indicates contract revert)
  if (matchesError(errorMsg, "gas", "estimation")) {
    return "Transaction would fail. Please check your inputs and try again.";
  }

  // Chain/network mismatch
  if (matchesError(errorMsg, "chain", "wrong network")) {
    return "Wrong network. Please switch to the correct network.";
  }

  // Default fallback
  return "Transaction failed. Please try again.";
}

/**
 * Formats NFC-specific errors with guidance for physical interactions
 */
export function formatNFCError(error: unknown): string {
  const errorMsg = getErrorMessage(error);

  // Chip read timeout
  if (matchesError(errorMsg, "timeout", "timed out")) {
    return "Chip tap timed out. Please hold your phone steady against the chip.";
  }

  // NFC not supported on device
  if (matchesError(errorMsg, "not supported", "unavailable", "no nfc")) {
    return "NFC is not supported on this device.";
  }

  // NFC disabled on device
  if (matchesError(errorMsg, "disabled", "turned off")) {
    return "NFC is disabled. Please enable NFC in your device settings.";
  }

  // Communication error during read
  if (matchesError(errorMsg, "communication", "read error", "tag lost")) {
    return "Lost connection to chip. Please hold your phone steady and try again.";
  }

  // Different chip used between taps
  if (matchesError(errorMsg, "different chip", "mismatch")) {
    return "Different chip detected. Please use the same chip for all taps.";
  }

  // Fall back to wallet error formatting for other cases
  return formatWalletError(error);
}

/**
 * Formats API/server errors
 */
export function formatAPIError(error: unknown): string {
  const errorMsg = getErrorMessage(error);

  // Rate limiting
  if (matchesError(errorMsg, "rate limit", "too many requests", "429")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  // Server errors
  if (matchesError(errorMsg, "500", "internal server", "server error")) {
    return "Server error. Please try again in a moment.";
  }

  // Unauthorized
  if (matchesError(errorMsg, "401", "unauthorized", "authentication")) {
    return "Please log in again to continue.";
  }

  // Not found
  if (matchesError(errorMsg, "404", "not found")) {
    return "Resource not found. Please refresh the page.";
  }

  // Network/fetch errors
  if (matchesError(errorMsg, "fetch", "network")) {
    return "Unable to reach server. Please check your connection.";
  }

  // Default
  return "Request failed. Please try again.";
}

/**
 * Formats payment request errors
 */
export function formatPaymentRequestError(error: unknown): string {
  const errorMsg = getErrorMessage(error);

  // Already has pending request
  if (matchesError(errorMsg, "pending request", "already exists")) {
    return "A payment request is already pending for this person.";
  }

  // Request expired
  if (matchesError(errorMsg, "expired")) {
    return "This payment request has expired.";
  }

  // Request already completed
  if (matchesError(errorMsg, "completed", "already paid")) {
    return "This payment has already been completed.";
  }

  // Fall back to API error formatting
  return formatAPIError(error);
}

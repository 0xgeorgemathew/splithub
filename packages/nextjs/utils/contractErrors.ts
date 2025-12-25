/**
 * Contract Error Parser
 *
 * Extracts human-readable error messages from contract errors.
 * Used by payment relay routes to provide clear error feedback.
 */

/**
 * Contract error codes and their human-readable messages
 */
const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  UnauthorizedSigner: "Unauthorized signer: The NFC chip is not registered to this wallet",
  InvalidNonce: "Invalid nonce: Transaction out of order or already processed",
  ExpiredSignature: "Signature expired: Please try again",
  InvalidSignature: "Invalid signature: Signature verification failed",
  "ERC20: insufficient allowance": "Insufficient token allowance: Please approve the contract to spend your tokens",
  "ERC20: transfer amount exceeds balance": "Insufficient balance: You don't have enough tokens",
};

/**
 * Parses a contract error and returns a human-readable message
 *
 * @param error - The error to parse
 * @returns Human-readable error message
 */
export function parseContractError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown error";
  }

  const message = error.message;

  // Check for known contract errors
  for (const [errorKey, userMessage] of Object.entries(CONTRACT_ERROR_MESSAGES)) {
    if (message.includes(errorKey)) {
      return userMessage;
    }
  }

  return message;
}

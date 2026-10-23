/**
 * Payment Request Validation Service
 *
 * Validates payment request data and checks for existing requests.
 */
import { isAddress } from "viem";
import { PAYMENT_REQUEST_CONFIG } from "~~/config/tokens";
import { supabase } from "~~/lib/supabase";

export interface PaymentRequestInput {
  payer: string;
  recipient: string;
  token: string;
  amount: string | number;
  memo?: string;
  payerTwitter?: string;
  requesterTwitter?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedPayer?: string;
  normalizedRecipient?: string;
  parsedAmount?: number;
}

export interface ExistingRequestResult {
  exists: boolean;
  requestId?: string;
  amount?: string;
}

/**
 * Validates payment request input fields
 *
 * @param input - Payment request input to validate
 * @returns Validation result with normalized values or error
 */
export function validatePaymentRequestInput(input: PaymentRequestInput): ValidationResult {
  const { payer, recipient, token, amount } = input;

  // Validate required fields
  if (!payer || !recipient || !token || !amount) {
    return { valid: false, error: "Missing required fields: payer, recipient, token, amount" };
  }

  // Validate addresses
  if (!isAddress(payer)) {
    return { valid: false, error: "Invalid payer address" };
  }

  if (!isAddress(recipient)) {
    return { valid: false, error: "Invalid recipient address" };
  }

  if (!isAddress(token)) {
    return { valid: false, error: "Invalid token address" };
  }

  // Validate amount
  const parsedAmount = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { valid: false, error: "Invalid amount" };
  }

  return {
    valid: true,
    normalizedPayer: payer.toLowerCase(),
    normalizedRecipient: recipient.toLowerCase(),
    parsedAmount,
  };
}

/**
 * Checks if a pending payment request already exists between two parties
 *
 * @param payer - Payer wallet address (normalized)
 * @param recipient - Recipient wallet address (normalized)
 * @returns Existing request info if found
 */
export async function findExistingPendingRequest(payer: string, recipient: string): Promise<ExistingRequestResult> {
  const { data, error } = await supabase
    .from("payment_requests")
    .select("id, amount")
    .eq("payer", payer)
    .eq("recipient", recipient)
    .eq("status", "pending")
    .single();

  if (error || !data) {
    return { exists: false };
  }

  return {
    exists: true,
    requestId: data.id,
    amount: data.amount,
  };
}

/**
 * Calculates payment request expiration date
 *
 * @returns ISO string of expiration date
 */
export function calculateExpirationDate(): string {
  const expiryMs = PAYMENT_REQUEST_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000;
  return new Date(Date.now() + expiryMs).toISOString();
}

/**
 * Payment Request Service
 *
 * Database operations for payment requests.
 */
import { supabase } from "~~/lib/supabase";

export interface PaymentRequest {
  id: string;
  payer: string;
  recipient: string;
  token: string;
  amount: string;
  memo?: string;
  status: "pending" | "completed" | "expired";
  tx_hash?: string;
  expires_at: string;
  created_at: string;
  completed_at?: string;
  payer_twitter?: string;
  requester_twitter?: string;
}

export interface CreatePaymentRequestParams {
  payer: string;
  recipient: string;
  token: string;
  amount: string;
  memo?: string;
  expiresAt: string;
  payerTwitter?: string;
  requesterTwitter?: string;
}

/**
 * Creates a new payment request
 *
 * @param params - Request parameters
 * @returns Created payment request
 */
export async function createPaymentRequest(params: CreatePaymentRequestParams): Promise<PaymentRequest> {
  const { data, error } = await supabase
    .from("payment_requests")
    .insert({
      payer: params.payer,
      recipient: params.recipient,
      token: params.token.toLowerCase(),
      amount: params.amount,
      memo: params.memo || null,
      status: "pending",
      expires_at: params.expiresAt,
      payer_twitter: params.payerTwitter || null,
      requester_twitter: params.requesterTwitter || null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create payment request: ${error?.message}`);
  }

  return data as PaymentRequest;
}

/**
 * Marks a payment request as completed
 *
 * @param requestId - Payment request ID
 * @param txHash - Transaction hash of the payment
 * @returns Updated payment request
 */
export async function completePaymentRequest(requestId: string, txHash: string): Promise<PaymentRequest> {
  const { data, error } = await supabase
    .from("payment_requests")
    .update({
      status: "completed",
      tx_hash: txHash,
      completed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to complete payment request: ${error?.message}`);
  }

  return data as PaymentRequest;
}

/**
 * Gets a payment request by ID
 *
 * @param requestId - Payment request ID
 * @returns Payment request or null if not found
 */
export async function getPaymentRequest(requestId: string): Promise<PaymentRequest | null> {
  const { data, error } = await supabase.from("payment_requests").select("*").eq("id", requestId).single();

  if (error || !data) {
    return null;
  }

  return data as PaymentRequest;
}

/**
 * Verifies a payment request exists and is pending
 *
 * @param requestId - Payment request ID
 * @returns Object with exists flag and current status
 */
export async function verifyPendingRequest(
  requestId: string,
): Promise<{ exists: boolean; status?: string; error?: string }> {
  const { data, error } = await supabase.from("payment_requests").select("status").eq("id", requestId).single();

  if (error || !data) {
    return { exists: false, error: "Payment request not found" };
  }

  if (data.status !== "pending") {
    return { exists: true, status: data.status, error: `Cannot update request with status: ${data.status}` };
  }

  return { exists: true, status: data.status };
}

/**
 * Updates expired pending requests to expired status
 *
 * @param requestId - Payment request ID
 */
export async function markRequestExpired(requestId: string): Promise<void> {
  await supabase.from("payment_requests").update({ status: "expired" }).eq("id", requestId);
}

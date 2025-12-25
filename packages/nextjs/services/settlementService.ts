/**
 * Settlement Service
 *
 * Handles settlement completion flows including marking payment
 * requests as complete and recording settlements in the database.
 */
import { type PaymentRequest } from "~~/lib/supabase";

export interface SettlementCompletionParams {
  /** Payment request ID */
  requestId: string;
  /** Payment request data */
  request: PaymentRequest;
  /** Transaction hash of the payment */
  txHash: string;
}

/**
 * Completes a settlement flow by marking the payment request
 * as completed and recording the settlement in the database.
 *
 * Also triggers browser events to refresh UI components.
 *
 * @param params - Settlement completion parameters
 * @returns True if all operations succeeded
 */
export async function completeSettlementFlow(params: SettlementCompletionParams): Promise<boolean> {
  const { requestId, request, txHash } = params;

  try {
    // 1. Mark payment request as completed
    const requestResponse = await fetch(`/api/payment-requests/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    });

    if (!requestResponse.ok) {
      console.error("Failed to mark request as completed");
      return false;
    }

    // 2. Record settlement in database
    const settlementResponse = await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payerWallet: request.payer,
        payeeWallet: request.recipient,
        amount: request.amount,
        tokenAddress: request.token,
        txHash,
      }),
    });

    if (!settlementResponse.ok) {
      console.error("Failed to record settlement");
      // Not returning false as the payment request was already marked complete
    }

    // 3. Trigger refresh events for UI components
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("refreshPaymentRequests"));
      window.dispatchEvent(new Event("refreshBalances"));
    }

    return true;
  } catch (error) {
    console.error("Error completing settlement flow:", error);
    return false;
  }
}

/**
 * Records a settlement in the database
 *
 * @param params - Settlement parameters
 * @returns True if successful
 */
export async function recordSettlement(params: {
  payerWallet: string;
  payeeWallet: string;
  amount: string;
  tokenAddress: string;
  txHash: string;
}): Promise<boolean> {
  try {
    const response = await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    return response.ok;
  } catch (error) {
    console.error("Error recording settlement:", error);
    return false;
  }
}

/**
 * Triggers balance and payment request refresh events
 */
export function triggerRefreshEvents(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("refreshPaymentRequests"));
    window.dispatchEvent(new Event("refreshBalances"));
  }
}

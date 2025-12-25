/**
 * Notification Service
 *
 * Sends push notifications to users for payment requests and other events.
 */

export interface NotificationPayload {
  /** Wallet address of the notification recipient */
  recipientWallet: string;
  /** Notification title */
  title: string;
  /** Notification message body */
  message: string;
  /** URL to open when notification is clicked */
  url?: string;
}

/**
 * Sends a push notification to a user
 *
 * This is non-critical - failures are logged but do not throw.
 *
 * @param payload - Notification payload
 * @returns True if notification was sent successfully
 */
export async function sendPushNotification(payload: NotificationPayload): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splithub.app";

  console.log("[Notification] Sending:", payload);

  try {
    const response = await fetch(`${baseUrl}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("[Notification] Sent successfully:", data);
      return true;
    } else {
      console.error("[Notification] Failed:", data);
      return false;
    }
  } catch (error) {
    console.error("[Notification] Error:", error);
    return false;
  }
}

/**
 * Sends a payment request notification to the payer
 *
 * @param params - Notification parameters
 */
export async function sendPaymentRequestNotification(params: {
  payerWallet: string;
  requestId: string;
  amount: string;
  memo?: string;
  requesterTwitter?: string;
}): Promise<boolean> {
  const { payerWallet, requestId, amount, memo, requesterTwitter } = params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splithub.app";

  return sendPushNotification({
    recipientWallet: payerWallet.toLowerCase(),
    title: `Payment Request from @${requesterTwitter || "someone"}`,
    message: `${amount} USDC${memo ? ` - ${memo}` : ""}`,
    url: `${baseUrl}/settle/${requestId}`,
  });
}

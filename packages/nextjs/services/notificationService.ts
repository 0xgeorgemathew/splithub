/**
 * OneSignal Notification Service
 * Server-side service for sending push notifications
 */

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

interface PaymentRequestNotificationParams {
  playerId: string;
  amount: string;
  requesterName: string;
  memo?: string;
  requestId: string;
}

interface PaymentCompletedNotificationParams {
  playerId: string;
  amount: string;
  payerName: string;
}

/**
 * Send a push notification for a new payment request
 */
export async function sendPaymentRequestNotification({
  playerId,
  amount,
  requesterName,
  memo,
  requestId,
}: PaymentRequestNotificationParams): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.warn("OneSignal not configured, skipping notification");
    return false;
  }

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [playerId],
        headings: { en: "Payment Request" },
        contents: {
          en: memo ? `@${requesterName} requests $${amount} - ${memo}` : `@${requesterName} requests $${amount}`,
        },
        url: `${process.env.NEXT_PUBLIC_APP_URL || "https://splithub.app"}/settle/${requestId}`,
        data: {
          type: "payment_request",
          requestId,
          amount,
          requester: requesterName,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OneSignal API error:", error);
      return false;
    }

    const result = await response.json();
    console.log("Notification sent:", result.id);
    return true;
  } catch (error) {
    console.error("Failed to send notification:", error);
    return false;
  }
}

/**
 * Send a push notification when a payment is completed
 */
export async function sendPaymentCompletedNotification({
  playerId,
  amount,
  payerName,
}: PaymentCompletedNotificationParams): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.warn("OneSignal not configured, skipping notification");
    return false;
  }

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [playerId],
        headings: { en: "Payment Received!" },
        contents: {
          en: `@${payerName} paid you $${amount}`,
        },
        data: {
          type: "payment_completed",
          amount,
          payer: payerName,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OneSignal API error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send notification:", error);
    return false;
  }
}

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
    const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://splithub.app"}/settle/${requestId}`;

    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      // Use include_subscription_ids (v16) instead of deprecated include_player_ids
      include_subscription_ids: [playerId],
      headings: { en: "Payment Request" },
      contents: {
        en: memo ? `@${requesterName} requests $${amount} - ${memo}` : `@${requesterName} requests $${amount}`,
      },
      url: targetUrl,
      web_url: targetUrl,
      data: {
        type: "payment_request",
        requestId,
        amount,
        requester: requesterName,
        url: targetUrl,
      },
    };

    console.log("[OneSignal] Sending payment request notification:", {
      subscriptionId: playerId,
      requestId,
      targetUrl,
    });

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[OneSignal] API error:", {
        status: response.status,
        errors: result.errors,
        subscriptionId: playerId,
        requestId,
      });
      return false;
    }

    console.log("[OneSignal] Notification sent successfully:", {
      notificationId: result.id,
      recipients: result.recipients,
    });
    return true;
  } catch (error) {
    console.error("[OneSignal] Failed to send notification:", error);
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
    const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://splithub.app"}/splits`;

    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      // Use include_subscription_ids (v16) instead of deprecated include_player_ids
      include_subscription_ids: [playerId],
      headings: { en: "Payment Received!" },
      contents: {
        en: `@${payerName} paid you $${amount}`,
      },
      url: targetUrl,
      web_url: targetUrl,
      data: {
        type: "payment_completed",
        amount,
        payer: payerName,
        url: targetUrl,
      },
    };

    console.log("[OneSignal] Sending payment completed notification:", {
      subscriptionId: playerId,
      amount,
      payerName,
    });

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[OneSignal] API error:", {
        status: response.status,
        errors: result.errors,
        subscriptionId: playerId,
      });
      return false;
    }

    console.log("[OneSignal] Payment completed notification sent:", {
      notificationId: result.id,
      recipients: result.recipients,
    });
    return true;
  } catch (error) {
    console.error("[OneSignal] Failed to send notification:", error);
    return false;
  }
}

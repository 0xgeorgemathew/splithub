import { NextRequest, NextResponse } from "next/server";
import { getOneSignalPlayerId } from "~~/services/userService";

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

/**
 * DEBUG ENDPOINT: Test OneSignal notification delivery
 *
 * Usage: GET /api/debug/test-notification?wallet=0x...
 *
 * Returns detailed info about the notification attempt including:
 * - Whether the subscription ID was found
 * - The exact payload sent to OneSignal
 * - OneSignal's response (success/error)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet parameter" }, { status: 400 });
  }

  const debugInfo: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    wallet: wallet.toLowerCase(),
    onesignalConfigured: !!(ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY),
  };

  // Step 1: Get subscription ID from database
  const subscriptionId = await getOneSignalPlayerId(wallet.toLowerCase());
  debugInfo.subscriptionId = subscriptionId;
  debugInfo.subscriptionIdFound = !!subscriptionId;

  if (!subscriptionId) {
    return NextResponse.json({
      ...debugInfo,
      error: "No OneSignal subscription ID found for this wallet",
      suggestion: "User needs to enable notifications in the app first",
    });
  }

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return NextResponse.json({
      ...debugInfo,
      error: "OneSignal not configured",
    });
  }

  // Step 2: Send test notification
  const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://splithub.app"}/splits`;

  const notificationPayload = {
    app_id: ONESIGNAL_APP_ID,
    include_subscription_ids: [subscriptionId],
    headings: { en: "Test Notification" },
    contents: { en: "This is a test notification from the debug endpoint" },
    url: targetUrl,
    web_url: targetUrl,
    data: {
      type: "test",
      url: targetUrl,
    },
  };

  debugInfo.payloadSent = {
    ...notificationPayload,
    app_id: "[REDACTED]",
  };

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();

    debugInfo.onesignalResponse = {
      status: response.status,
      ok: response.ok,
      ...result,
    };

    if (!response.ok) {
      return NextResponse.json({
        ...debugInfo,
        success: false,
        error: "OneSignal API returned an error",
        errors: result.errors,
      });
    }

    return NextResponse.json({
      ...debugInfo,
      success: true,
      notificationId: result.id,
      recipients: result.recipients,
      message:
        result.recipients > 0
          ? "Notification sent successfully! Check your device."
          : "Notification sent but 0 recipients - subscription may be invalid/expired",
    });
  } catch (error) {
    debugInfo.error = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ...debugInfo,
        success: false,
      },
      { status: 500 },
    );
  }
}

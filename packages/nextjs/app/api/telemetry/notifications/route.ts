import { NextRequest, NextResponse } from "next/server";

interface TelemetryPayload {
  wallet: string | null;
  duration: number;
  errorCode: string;
  permission: boolean | null;
  subscriptionId: string | null;
  userAgent: string;
  timestamp: string;
}

// POST /api/telemetry/notifications - Log notification telemetry for debugging
export async function POST(request: NextRequest) {
  try {
    const body: TelemetryPayload = await request.json();

    // Log to server console for debugging
    console.log("[Notification Telemetry]", {
      wallet: body.wallet,
      duration: body.duration,
      errorCode: body.errorCode,
      permission: body.permission,
      subscriptionId: body.subscriptionId,
      userAgent: body.userAgent?.slice(0, 100), // Truncate user agent
      timestamp: body.timestamp,
    });

    // In production, you could also:
    // 1. Store in database for querying
    // 2. Send to external monitoring service (Sentry, DataDog, etc.)
    // 3. Aggregate metrics

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Telemetry] Failed to process:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

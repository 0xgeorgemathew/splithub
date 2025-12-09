import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { recipientWallet, title, message, url } = await request.json();

    if (!recipientWallet || !title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        include_aliases: {
          external_id: [recipientWallet.toLowerCase()],
        },
        target_channel: "push",
        headings: { en: title },
        contents: { en: message },
        url: url || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OneSignal API error:", data);
      return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Notification send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

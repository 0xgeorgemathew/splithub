import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~~/lib/supabase";

// POST /api/payment-requests/[id]/remind - Send a reminder notification for an existing payment request
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Request ID required" }, { status: 400 });
    }

    // Fetch the existing payment request
    const { data: paymentRequest, error: fetchError } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !paymentRequest) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    // Only allow reminders for pending requests
    if (paymentRequest.status !== "pending") {
      return NextResponse.json({ error: `Cannot send reminder for ${paymentRequest.status} request` }, { status: 400 });
    }

    // Check if request has expired
    const now = new Date();
    if (new Date(paymentRequest.expires_at) < now) {
      // Update status to expired
      await supabase.from("payment_requests").update({ status: "expired" }).eq("id", id);
      return NextResponse.json({ error: "Payment request has expired" }, { status: 400 });
    }

    // Send push notification to payer (fire and forget - same pattern as payment-requests POST)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splithub.app";
    const notificationPayload = {
      recipientWallet: paymentRequest.payer,
      title: `Reminder: Payment Request from @${paymentRequest.requester_twitter || "someone"}`,
      message: `${paymentRequest.amount} USDC${paymentRequest.memo ? ` - ${paymentRequest.memo}` : ""}`,
      url: `${baseUrl}/settle/${paymentRequest.id}`,
    };
    console.log("[PaymentRequest] Sending reminder notification:", notificationPayload);

    // Fire and forget - don't block the response on notification delivery
    fetch(`${baseUrl}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationPayload),
    })
      .then(async res => {
        const responseData = await res.json();
        if (res.ok) {
          console.log("[PaymentRequest] Reminder notification sent:", responseData);
        } else {
          console.error("[PaymentRequest] Reminder notification failed:", responseData);
        }
      })
      .catch(err => {
        console.error("[PaymentRequest] Reminder notification error:", err);
      });

    return NextResponse.json({
      success: true,
      message: "Reminder sent successfully",
      requestId: paymentRequest.id,
    });
  } catch (err) {
    console.error("Payment request reminder error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

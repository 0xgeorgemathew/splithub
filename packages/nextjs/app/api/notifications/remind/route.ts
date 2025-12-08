import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { supabase } from "~~/lib/supabase";
import { sendPaymentRequestNotification } from "~~/services/notificationService";
import { getOneSignalPlayerId } from "~~/services/userService";

interface RemindRequestBody {
  friendWallet: string;
  requesterWallet: string;
  amount?: string;
  memo?: string;
}

// POST /api/notifications/remind - Send a reminder notification without creating a new request
export async function POST(request: NextRequest) {
  try {
    const body: RemindRequestBody = await request.json();
    const { friendWallet, requesterWallet, amount, memo } = body;

    if (!friendWallet || !requesterWallet) {
      return NextResponse.json({ error: "friendWallet and requesterWallet required" }, { status: 400 });
    }

    if (!isAddress(friendWallet) || !isAddress(requesterWallet)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const friendLower = friendWallet.toLowerCase();
    const requesterLower = requesterWallet.toLowerCase();

    // Get requester's twitter handle for the notification
    const { data: requesterData } = await supabase
      .from("users")
      .select("twitter_handle")
      .eq("wallet_address", requesterLower)
      .single();

    // Get friend's OneSignal player ID
    const playerId = await getOneSignalPlayerId(friendLower);

    if (!playerId) {
      return NextResponse.json({
        success: false,
        notificationSent: false,
        message: "Friend has not enabled notifications",
      });
    }

    // Check if there's an existing pending request to include in the notification
    const { data: existingRequest } = await supabase
      .from("payment_requests")
      .select("id, amount")
      .eq("payer", friendLower)
      .eq("recipient", requesterLower)
      .eq("status", "pending")
      .single();

    // Send notification
    try {
      await sendPaymentRequestNotification({
        playerId,
        amount: amount || existingRequest?.amount?.toString() || "0",
        requesterName: requesterData?.twitter_handle || "Someone",
        memo: memo || "Payment reminder",
        requestId: existingRequest?.id,
      });

      return NextResponse.json({
        success: true,
        notificationSent: true,
        message: "Reminder sent successfully",
      });
    } catch (notifError) {
      console.error("Failed to send reminder:", notifError);
      return NextResponse.json({
        success: false,
        notificationSent: false,
        message: "Failed to send notification",
      });
    }
  } catch (err) {
    console.error("Remind endpoint error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

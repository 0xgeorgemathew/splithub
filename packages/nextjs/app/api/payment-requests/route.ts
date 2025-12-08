import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { supabase } from "~~/lib/supabase";
import { sendPaymentRequestNotification } from "~~/services/notificationService";
import { getOneSignalPlayerId } from "~~/services/userService";

// GET /api/payment-requests - Fetch payment requests for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");
    const type = searchParams.get("type"); // 'incoming' or 'outgoing'

    if (!wallet) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    if (!isAddress(wallet)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const walletLower = wallet.toLowerCase();
    let query = supabase.from("payment_requests").select(
      `
        *,
        payer_user:users!payment_requests_payer_fkey(
          name,
          twitter_handle,
          twitter_profile_url
        ),
        recipient_user:users!payment_requests_recipient_fkey(
          name,
          twitter_handle,
          twitter_profile_url
        )
      `,
    );

    // Filter by type
    if (type === "incoming") {
      // Requests where this wallet needs to pay
      query = query.eq("payer", walletLower);
    } else if (type === "outgoing") {
      // Requests where this wallet is waiting for payment
      query = query.eq("recipient", walletLower);
    } else {
      // All requests involving this wallet
      query = query.or(`payer.eq.${walletLower},recipient.eq.${walletLower}`);
    }

    // Order by creation date, newest first
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch payment requests" }, { status: 500 });
    }

    // Update expired requests
    const now = new Date();
    const updatedData = await Promise.all(
      data.map(async request => {
        if (request.status === "pending" && new Date(request.expires_at) < now) {
          await supabase.from("payment_requests").update({ status: "expired" }).eq("id", request.id);
          return { ...request, status: "expired" };
        }
        return request;
      }),
    );

    return NextResponse.json({ data: updatedData });
  } catch (err) {
    console.error("Payment request fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/payment-requests - Create a new payment request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { payer, recipient, token, amount, memo, payerTwitter, requesterTwitter } = body;

    // Validate required fields
    if (!payer || !recipient || !token || !amount) {
      return NextResponse.json({ error: "Missing required fields: payer, recipient, token, amount" }, { status: 400 });
    }

    // Validate addresses
    if (!isAddress(payer)) {
      return NextResponse.json({ error: "Invalid payer address" }, { status: 400 });
    }

    if (!isAddress(recipient)) {
      return NextResponse.json({ error: "Invalid recipient address" }, { status: 400 });
    }

    if (!isAddress(token)) {
      return NextResponse.json({ error: "Invalid token address" }, { status: 400 });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const payerLower = payer.toLowerCase();
    const recipientLower = recipient.toLowerCase();

    // Check if there's already a pending request for this payer-recipient pair
    const { data: existingRequest, error: checkError } = await supabase
      .from("payment_requests")
      .select("id, amount")
      .eq("payer", payerLower)
      .eq("recipient", recipientLower)
      .eq("status", "pending")
      .single();

    // If a pending request already exists, still send notification as a reminder
    if (existingRequest && !checkError) {
      // Send reminder notification (non-blocking)
      let notificationSent = false;
      try {
        const playerId = await getOneSignalPlayerId(payerLower);
        if (playerId) {
          await sendPaymentRequestNotification({
            playerId,
            amount: existingRequest.amount.toString(),
            requesterName: requesterTwitter || "Someone",
            memo: memo || "Payment reminder",
            requestId: existingRequest.id,
          });
          notificationSent = true;
        }
      } catch (notifError) {
        console.error("Failed to send reminder notification:", notifError);
      }

      return NextResponse.json({
        requestId: existingRequest.id,
        settleUrl: `/settle/${existingRequest.id}`,
        message: "A pending payment request already exists. Reminder notification sent.",
        isExisting: true,
        notificationSent,
      });
    }

    // Set expiration to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Insert into database
    const { data, error } = await supabase
      .from("payment_requests")
      .insert({
        payer: payerLower,
        recipient: recipientLower,
        token: token.toLowerCase(),
        amount: amount.toString(),
        memo: memo || null,
        status: "pending",
        expires_at: expiresAt,
        payer_twitter: payerTwitter || null,
        requester_twitter: requesterTwitter || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to create payment request" }, { status: 500 });
    }

    // Send push notification to the payer (non-blocking)
    try {
      const playerId = await getOneSignalPlayerId(payerLower);
      if (playerId) {
        await sendPaymentRequestNotification({
          playerId,
          amount: amount.toString(),
          requesterName: requesterTwitter || "Someone",
          memo: memo || undefined,
          requestId: data.id,
        });
      }
    } catch (notifError) {
      // Non-critical - log but don't fail the request
      console.error("Failed to send notification:", notifError);
    }

    return NextResponse.json({
      requestId: data.id,
      settleUrl: `/settle/${data.id}`,
      isExisting: false,
    });
  } catch (err) {
    console.error("Payment request creation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

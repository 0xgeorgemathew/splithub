import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { supabase } from "~~/lib/supabase";
import { sendPaymentRequestNotification } from "~~/services/notificationService";
import { createPaymentRequest } from "~~/services/paymentRequestService";
import {
  calculateExpirationDate,
  findExistingPendingRequest,
  validatePaymentRequestInput,
} from "~~/services/paymentRequestValidation";

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

    // Validate input using service
    const validation = validatePaymentRequestInput({ payer, recipient, token, amount });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { normalizedPayer, normalizedRecipient } = validation;

    // Check for existing pending request
    const existing = await findExistingPendingRequest(normalizedPayer!, normalizedRecipient!);
    if (existing.exists) {
      return NextResponse.json({
        requestId: existing.requestId,
        settleUrl: `/settle/${existing.requestId}`,
        message: "A pending payment request already exists.",
        isExisting: true,
      });
    }

    // Create payment request
    const data = await createPaymentRequest({
      payer: normalizedPayer!,
      recipient: normalizedRecipient!,
      token,
      amount: amount.toString(),
      memo,
      expiresAt: calculateExpirationDate(),
      payerTwitter,
      requesterTwitter,
    });

    // Send notification (non-blocking)
    sendPaymentRequestNotification({
      payerWallet: normalizedPayer!,
      requestId: data.id,
      amount: amount.toString(),
      memo,
      requesterTwitter,
    });

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

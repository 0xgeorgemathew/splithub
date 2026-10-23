import { createFileRoute } from "@tanstack/react-router";
import { isAddress } from "viem";
import { errorResponse, requireUser, sameWallet } from "~~/lib/auth";
import { supabase } from "~~/lib/supabase";
import { sendPaymentRequestNotification } from "~~/services/notificationService";
import { createPaymentRequest } from "~~/services/paymentRequestService";
import {
  calculateExpirationDate,
  findExistingPendingRequest,
  validatePaymentRequestInput,
} from "~~/services/paymentRequestValidation";

// GET /api/payment-requests - Fetch payment requests for a user
async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");
    const type = searchParams.get("type"); // 'incoming' or 'outgoing'

    if (!wallet) {
      return Response.json({ error: "Wallet address required" }, { status: 400 });
    }

    if (!isAddress(wallet)) {
      return Response.json({ error: "Invalid wallet address" }, { status: 400 });
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
      return Response.json({ error: "Failed to fetch payment requests" }, { status: 500 });
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

    return Response.json({ data: updatedData });
  } catch (err) {
    console.error("Payment request fetch error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/payment-requests - Create a new payment request
async function POST(request: Request) {
  try {
    const { wallet } = await requireUser(request);
    const body = await request.json();
    const { payer, recipient, token, amount, memo, payerTwitter, requesterTwitter } = body;
    // The requester is the one being paid, so requests can only be created for yourself.
    if (!sameWallet(recipient, wallet)) {
      return Response.json({ error: "You can only request payments to your own wallet" }, { status: 403 });
    }

    // Validate input using service
    const validation = validatePaymentRequestInput({ payer, recipient, token, amount });
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const { normalizedPayer, normalizedRecipient } = validation;

    // Check for existing pending request
    const existing = await findExistingPendingRequest(normalizedPayer!, normalizedRecipient!);
    if (existing.exists) {
      return Response.json({
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

    return Response.json({
      requestId: data.id,
      settleUrl: `/settle/${data.id}`,
      isExisting: false,
    });
  } catch (err) {
    return errorResponse(err, "Payment request creation error");
  }
}

export const Route = createFileRoute("/api/payment-requests/")({
  server: {
    handlers: {
      GET: ({ request }) => GET(request),
      POST: ({ request }) => POST(request),
    },
  },
});

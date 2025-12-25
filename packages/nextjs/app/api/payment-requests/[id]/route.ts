import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~~/lib/supabase";
import { completePaymentRequest, verifyPendingRequest } from "~~/services/paymentRequestService";

// GET /api/payment-requests/[id] - Fetch a payment request by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("payment_requests")
      .select(
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
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check if expired
    if (data.status === "pending" && new Date(data.expires_at) < new Date()) {
      await supabase.from("payment_requests").update({ status: "expired" }).eq("id", id);

      data.status = "expired";
    }

    return NextResponse.json({ data });
  } catch (_err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/payment-requests/[id] - Update a payment request (mark as completed)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, tx_hash } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing request ID" }, { status: 400 });
    }

    if (status !== "completed") {
      return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    }

    if (!tx_hash) {
      return NextResponse.json({ error: "Transaction hash required for completion" }, { status: 400 });
    }

    // Verify request is pending
    const verification = await verifyPendingRequest(id);
    if (!verification.exists) {
      return NextResponse.json({ error: verification.error }, { status: 404 });
    }
    if (verification.status !== "pending") {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    // Complete the request
    const data = await completePaymentRequest(id, tx_hash);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Payment request update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/payment-requests/[id] - Alternative completion endpoint
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { txHash } = await request.json();

    if (!txHash) {
      return NextResponse.json({ error: "Transaction hash required" }, { status: 400 });
    }

    const data = await completePaymentRequest(id, txHash);
    return NextResponse.json({ success: true, data });
  } catch (_err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~~/lib/supabase";

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

    // Only allow updating to 'completed' status
    if (status !== "completed") {
      return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    }

    if (!tx_hash) {
      return NextResponse.json({ error: "Transaction hash required for completion" }, { status: 400 });
    }

    // Verify the request exists and is pending
    const { data: existingRequest, error: fetchError } = await supabase
      .from("payment_requests")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    if (existingRequest.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot update request with status: ${existingRequest.status}` },
        { status: 400 },
      );
    }

    // Update the request
    const { data, error } = await supabase
      .from("payment_requests")
      .update({
        status: "completed",
        tx_hash,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: "Failed to update payment request" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Payment request update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { txHash } = await request.json();

    if (!txHash) {
      return NextResponse.json({ error: "Transaction hash required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("payment_requests")
      .update({
        status: "completed",
        tx_hash: txHash,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (_err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

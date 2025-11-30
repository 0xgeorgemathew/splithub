import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~~/lib/supabase";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/payment-requests/[id] - Fetch a payment request by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Missing request ID" }, { status: 400 });
    }

    const { data, error } = await supabase.from("payment_requests").select("*").eq("id", id).single();

    if (error || !data) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date() && data.status === "pending") {
      // Update status to expired
      await supabase.from("payment_requests").update({ status: "expired" }).eq("id", id);

      return NextResponse.json({ error: "Payment request has expired" }, { status: 410 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Payment request fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/payment-requests/[id] - Update a payment request (mark as completed)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
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

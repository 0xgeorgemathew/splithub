import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { supabase } from "~~/lib/supabase";

// POST /api/payment-requests - Create a new payment request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payer, recipient, token, amount, memo } = body;

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

    // Set expiration to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Insert into database
    const { data, error } = await supabase
      .from("payment_requests")
      .insert({
        payer: payer.toLowerCase(),
        recipient: recipient.toLowerCase(),
        token: token.toLowerCase(),
        amount: amount.toString(),
        memo: memo || null,
        status: "pending",
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to create payment request" }, { status: 500 });
    }

    return NextResponse.json({
      requestId: data.id,
      settleUrl: `/settle/${data.id}`,
    });
  } catch (err) {
    console.error("Payment request creation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

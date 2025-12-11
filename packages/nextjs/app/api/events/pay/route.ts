import { NextRequest, NextResponse } from "next/server";
import { createStallPayment, updatePaymentStatus } from "~~/services/eventsService";

export const dynamic = "force-dynamic";

interface StallPaymentRequest {
  stallId: number;
  eventId: number;
  ownerWallet: string;
  operatorWallet: string | null;
  splitPercentage: number;
  amount: string;
  auth: {
    payer: string;
    recipient: string;
    token: string;
    amount: string;
    nonce: string;
    deadline: string;
  };
  signature: string;
  contractAddress: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StallPaymentRequest = await request.json();

    // Calculate splits
    const totalAmount = parseFloat(body.amount);
    const operatorAmount = (totalAmount * body.splitPercentage) / 100;
    const ownerAmount = totalAmount - operatorAmount;

    // Create payment record
    const payment = await createStallPayment({
      stall_id: body.stallId,
      event_id: body.eventId,
      payer_wallet: body.auth.payer.toLowerCase(),
      amount: totalAmount,
      token_address: body.auth.token.toLowerCase(),
      operator_amount: operatorAmount,
      owner_amount: ownerAmount,
    });

    // Submit to relayer (reuse existing relay logic)
    // INTERNAL_API_URL for local dev (http://localhost:3000), defaults to production
    const baseUrl = process.env.INTERNAL_API_URL || "https://splithub.space";

    const relayResponse = await fetch(`${baseUrl}/api/relay/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth: body.auth,
        signature: body.signature,
        contractAddress: body.contractAddress,
      }),
    });

    const relayResult = await relayResponse.json();

    if (!relayResponse.ok) {
      await updatePaymentStatus(payment.id, "failed");
      throw new Error(relayResult.error || "Relay request failed");
    }

    // Update payment with tx hash
    const updatedPayment = await updatePaymentStatus(payment.id, "completed", relayResult.txHash);

    // TODO: If operator has wallet, create second settlement for split
    // For now, simplified version - all goes to recipient in auth

    return NextResponse.json({
      success: true,
      paymentId: updatedPayment.id,
      txHash: relayResult.txHash,
    });
  } catch (error: unknown) {
    console.error("Stall payment error:", error);
    const message = error instanceof Error ? error.message : "Payment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

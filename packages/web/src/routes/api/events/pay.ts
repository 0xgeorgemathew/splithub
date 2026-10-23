import { createFileRoute } from "@tanstack/react-router";
import { type Address, type Hex, formatUnits, isHash } from "viem";
import { TOKEN_DECIMALS } from "~~/config/tokens";
import { errorResponse, requireUser } from "~~/lib/auth";
import { createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { supabase } from "~~/lib/supabase";
import { PAYMENT_MAX_AGE_SECONDS, verifyPaymentTx } from "~~/lib/tapPayment";
import { safeProcessCircleAutoSplit } from "~~/services/circleAutoSplitService";
import { createStallPayment } from "~~/services/eventsService";
import { ensureUserExists } from "~~/services/userService";

/**
 * Records a stall payment after the terminal submitted a chip-authorized SplitHubPayments transfer.
 * The payer, amount and split are taken from the verified on-chain payment, not from the client, and the
 * caller must be the wallet that submitted it (the signed-in terminal), within the last 30 minutes.
 */
async function POST(request: Request) {
  try {
    const { wallet } = await requireUser(request);
    const { stallId, txHash } = (await request.json()) as { stallId?: number; txHash?: string };

    if (!stallId || typeof txHash !== "string" || !isHash(txHash)) {
      return Response.json({ error: "stallId and a payment txHash are required" }, { status: 400 });
    }

    const { data: stall, error: stallError } = await supabase
      .from("stalls")
      .select("id, event_id, operator_wallet, token_address, split_percentage")
      .eq("id", stallId)
      .single();
    if (stallError || !stall?.operator_wallet) {
      return Response.json({ error: "Stall not found or has no operator wallet" }, { status: 404 });
    }

    const { data: existing } = await supabase.from("stall_payments").select("id").eq("tx_hash", txHash).maybeSingle();
    if (existing) {
      return Response.json({ error: "This payment has already been recorded" }, { status: 409 });
    }

    const payment = await verifyPaymentTx(createBaseSepoliaPublicClient(), txHash as Hex, {
      recipient: stall.operator_wallet as Address,
      token: stall.token_address as Address,
      submitter: wallet as Address,
      maxAgeSeconds: PAYMENT_MAX_AGE_SECONDS,
    });

    const payerWallet = payment.payer.toLowerCase();
    await ensureUserExists(payerWallet);

    const totalAmount = Number(formatUnits(payment.amount, TOKEN_DECIMALS.USDC));
    const operatorAmount = (totalAmount * Number(stall.split_percentage)) / 100;

    const recorded = await createStallPayment({
      stall_id: stall.id,
      event_id: stall.event_id,
      payer_wallet: payerWallet,
      amount: totalAmount,
      token_address: stall.token_address.toLowerCase(),
      operator_amount: operatorAmount,
      owner_amount: totalAmount - operatorAmount,
      tx_hash: txHash,
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    const circleSplit = await safeProcessCircleAutoSplit({
      userWallet: payerWallet,
      amount: payment.amount.toString(),
      tokenAddress: stall.token_address,
      decimals: TOKEN_DECIMALS.USDC,
    });

    return Response.json({ success: true, paymentId: recorded.id, txHash, circleSplit });
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      return Response.json({ error: "This payment has already been recorded" }, { status: 409 });
    }
    return errorResponse(error, "Payment failed");
  }
}

function isUniqueViolation(error: unknown) {
  return error instanceof Error && /duplicate key value violates unique constraint/i.test(error.message);
}

export const Route = createFileRoute("/api/events/pay")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

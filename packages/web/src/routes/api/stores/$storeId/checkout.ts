import { createFileRoute } from "@tanstack/react-router";
import { type Address, type Hex, isHash } from "viem";
import { errorResponse, requireUser } from "~~/lib/auth";
import { createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { supabase } from "~~/lib/supabase";
import { PAYMENT_MAX_AGE_SECONDS, verifyPaymentTx } from "~~/lib/tapPayment";
import { buildCheckoutQuote, createStoreOrderRecord, decrementInventoryForQuote } from "~~/services/storeService";
import { ensureUserExists } from "~~/services/userService";

/**
 * intent "quote": price the cart server-side; the client pays `quote.payoutAmountMicros` to
 * `quote.payoutRecipient` with a chip-authorized SplitHubPayments transfer.
 * intent "confirm": re-quote, verify the on-chain payment in `txHash` (submitted by the signed-in caller in
 * the last 30 minutes), then record the order. The tx hash is unique per order.
 */
async function POST(request: Request, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    const body = await request.json();
    const { intent = "quote", cart = [], txHash } = body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return Response.json({ error: "A non-empty cart is required" }, { status: 400 });
    }

    const caller = intent === "quote" ? null : await requireUser(request);
    const quote = await buildCheckoutQuote(Number(storeId), cart);

    if (!caller) {
      return Response.json({ quote });
    }
    const { wallet } = caller;
    if (typeof txHash !== "string" || !isHash(txHash)) {
      return Response.json({ error: "A payment txHash is required to confirm checkout" }, { status: 400 });
    }

    const { data: existing } = await supabase.from("store_orders").select("id").eq("tx_hash", txHash).maybeSingle();
    if (existing) {
      return Response.json({ error: "This payment has already been used for an order" }, { status: 409 });
    }

    const payment = await verifyPaymentTx(createBaseSepoliaPublicClient(), txHash as Hex, {
      recipient: quote.payoutRecipient as Address,
      token: quote.tokenAddress as Address,
      amount: BigInt(quote.payoutAmountMicros),
      submitter: wallet as Address,
      maxAgeSeconds: PAYMENT_MAX_AGE_SECONDS,
    });

    await ensureUserExists(payment.payer);

    const { order } = await createStoreOrderRecord({
      stallId: Number(storeId),
      buyerWallet: payment.payer,
      quote,
      status: "completed",
      txHash,
    });

    let inventoryWarning: string | null = null;
    try {
      await decrementInventoryForQuote(quote);
    } catch (inventoryError) {
      console.error("Inventory decrement warning:", inventoryError);
      inventoryWarning =
        inventoryError instanceof Error ? inventoryError.message : "Inventory could not be decremented automatically";
    }

    return Response.json({ success: true, txHash, order, quote, inventoryWarning });
  } catch (error) {
    if (error instanceof Error && /duplicate key value violates unique constraint/i.test(error.message)) {
      return Response.json({ error: "This payment has already been used for an order" }, { status: 409 });
    }
    return errorResponse(error, "Failed to process store checkout");
  }
}

export const Route = createFileRoute("/api/stores/$storeId/checkout")({
  server: {
    handlers: {
      POST: ({ request, params }) => POST(request, { params }),
    },
  },
});

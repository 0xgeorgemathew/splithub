import { NextRequest, NextResponse } from "next/server";
import { type Address, type Hex, isHash } from "viem";
import { createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { supabase } from "~~/lib/supabase";
import { verifyPaymentTx } from "~~/lib/tapPayment";
import { buildCheckoutQuote, createStoreOrderRecord, decrementInventoryForQuote } from "~~/services/storeService";
import { ensureUserExists } from "~~/services/userService";

export const dynamic = "force-dynamic";

/**
 * intent "quote": price the cart server-side; the client pays `quote.payoutAmountMicros` to
 * `quote.payoutRecipient` with a chip-authorized SplitHubPayments transfer.
 * intent "confirm": re-quote, verify the on-chain payment in `txHash`, then record the order.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const body = await request.json();
    const { intent = "quote", cart = [], txHash } = body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "A non-empty cart is required" }, { status: 400 });
    }

    const quote = await buildCheckoutQuote(Number(storeId), cart);

    if (intent === "quote") {
      return NextResponse.json({ quote });
    }

    if (typeof txHash !== "string" || !isHash(txHash)) {
      return NextResponse.json({ error: "A payment txHash is required to confirm checkout" }, { status: 400 });
    }

    const { data: existing } = await supabase.from("store_orders").select("id").eq("tx_hash", txHash).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "This payment has already been used for an order" }, { status: 409 });
    }

    const payment = await verifyPaymentTx(createBaseSepoliaPublicClient(), txHash as Hex, {
      recipient: quote.payoutRecipient as Address,
      token: quote.tokenAddress as Address,
      amount: BigInt(quote.payoutAmountMicros),
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

    return NextResponse.json({ success: true, txHash, order, quote, inventoryWarning });
  } catch (error) {
    console.error("Store checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process store checkout" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  buildCheckoutQuote,
  completeStoreOrder,
  createStoreOrderRecord,
  decrementInventoryForQuote,
  failStoreOrder,
} from "~~/services/storeService";
import { ensureUserExists } from "~~/services/userService";

export const dynamic = "force-dynamic";

interface SignedPayment {
  payer: `0x${string}`;
  recipient: `0x${string}`;
  token: `0x${string}`;
  amount: string;
  nonce: string;
  deadline: string;
  signature: string;
}

const normalizeAddress = (value: string) => value.toLowerCase();

export async function POST(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const body = await request.json();
    const { intent = "quote", cart = [], buyerWallet, payments = [] } = body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "A non-empty cart is required" }, { status: 400 });
    }

    const quote = await buildCheckoutQuote(Number(storeId), cart);

    if (intent === "quote") {
      return NextResponse.json({ quote });
    }

    if (!buyerWallet || !isAddress(buyerWallet)) {
      return NextResponse.json({ error: "Valid buyerWallet is required for checkout confirmation" }, { status: 400 });
    }

    await ensureUserExists(buyerWallet);

    if (!Array.isArray(payments) || payments.length !== 2) {
      return NextResponse.json({ error: "Exactly two signed payments are required" }, { status: 400 });
    }

    const [managerPayment, adminPayment] = payments as SignedPayment[];
    const expectedRecipients = [quote.managerRecipient.toLowerCase(), quote.adminRecipient.toLowerCase()].sort();
    const receivedRecipients = [managerPayment.recipient.toLowerCase(), adminPayment.recipient.toLowerCase()].sort();

    if (expectedRecipients.join(":") !== receivedRecipients.join(":")) {
      return NextResponse.json(
        { error: "Signed recipients do not match the current store payout recipients" },
        { status: 400 },
      );
    }

    const normalizedBuyer = normalizeAddress(buyerWallet);
    const microsTotal = BigInt(quote.subtotalMicros);
    const microsSigned = BigInt(managerPayment.amount) + BigInt(adminPayment.amount);

    if (microsSigned !== microsTotal) {
      return NextResponse.json(
        { error: "Signed payment amounts do not match the current quote total" },
        { status: 400 },
      );
    }

    const payoutByRecipient = new Map<string, bigint>([
      [quote.managerRecipient.toLowerCase(), BigInt(quote.managerAmountMicros)],
      [quote.adminRecipient.toLowerCase(), BigInt(quote.adminAmountMicros)],
    ]);

    for (const payment of payments as SignedPayment[]) {
      if (!isAddress(payment.payer) || !isAddress(payment.recipient) || !isAddress(payment.token)) {
        return NextResponse.json({ error: "Each signed payment must include valid addresses" }, { status: 400 });
      }

      if (payment.payer.toLowerCase() !== normalizedBuyer) {
        return NextResponse.json({ error: "Signed payment payer does not match buyerWallet" }, { status: 400 });
      }

      if (payment.token.toLowerCase() !== quote.tokenAddress.toLowerCase()) {
        return NextResponse.json({ error: "Signed payment token does not match store quote token" }, { status: 400 });
      }

      const expectedAmount = payoutByRecipient.get(payment.recipient.toLowerCase());
      if (expectedAmount === undefined || BigInt(payment.amount) !== expectedAmount) {
        return NextResponse.json(
          { error: `Signed amount for ${payment.recipient} does not match the server quote` },
          { status: 400 },
        );
      }
    }

    const orderRecord = await createStoreOrderRecord({
      stallId: Number(storeId),
      buyerWallet,
      quote,
      status: "pending",
    });

    try {
      const relayResponse = await fetch(`${request.nextUrl.origin}/api/relay/batch-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payments,
        }),
      });

      const relayResult = await relayResponse.json();
      if (!relayResponse.ok) {
        await failStoreOrder(orderRecord.order.id);
        return NextResponse.json({ error: relayResult.error || "Batch payment failed" }, { status: 500 });
      }

      const completedOrder = await completeStoreOrder(orderRecord.order.id, relayResult.txHash);

      let inventoryWarning: string | null = null;
      try {
        await decrementInventoryForQuote(quote);
      } catch (inventoryError) {
        console.error("Inventory decrement warning:", inventoryError);
        inventoryWarning =
          inventoryError instanceof Error ? inventoryError.message : "Inventory could not be decremented automatically";
      }

      return NextResponse.json({
        success: true,
        txHash: relayResult.txHash,
        order: completedOrder,
        quote,
        inventoryWarning,
      });
    } catch (relayError) {
      await failStoreOrder(orderRecord.order.id);
      throw relayError;
    }
  } catch (error) {
    console.error("Store checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process store checkout" },
      { status: 500 },
    );
  }
}

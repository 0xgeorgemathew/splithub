import { createFileRoute } from "@tanstack/react-router";
import { type Address, type Hex, formatUnits, isHash } from "viem";
import { TOKENS, TOKEN_DECIMALS } from "~~/config/tokens";
import { errorResponse, requireUser } from "~~/lib/auth";
import { createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { supabase } from "~~/lib/supabase";
import { PAYMENT_MAX_AGE_SECONDS } from "~~/lib/tapPayment";
import { CREDIT_DECIMALS, type VenueCreditEvent, readVenueCreditTx } from "~~/lib/venueCredits";
import { safeProcessCircleAutoSplit } from "~~/services/circleAutoSplitService";
import { ensureUserExists } from "~~/services/userService";
import { getVenueByChainId } from "~~/services/venueService";

/**
 * Records a venue top-up, spend or refund after the device wallet submitted it to VenueCredits. Everything
 * recorded comes from the mined event; the caller must be the wallet that submitted the transaction, within
 * the last 30 minutes, and each transaction is recorded once.
 */
async function POST(request: Request) {
  try {
    const { wallet } = await requireUser(request);
    const { txHash } = (await request.json()) as { txHash?: string };
    if (typeof txHash !== "string" || !isHash(txHash)) {
      return Response.json({ error: "A transaction hash is required" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("venue_credit_activity")
      .select("id")
      .eq("tx_hash", txHash)
      .maybeSingle();
    if (existing) return Response.json({ error: "This transaction has already been recorded" }, { status: 409 });

    const { events } = await readVenueCreditTx(createBaseSepoliaPublicClient(), txHash as Hex, {
      submitter: wallet as Address,
      maxAgeSeconds: PAYMENT_MAX_AGE_SECONDS,
    });
    const event = events.find((e): e is Exclude<VenueCreditEvent, { kind: "created" }> => e.kind !== "created");
    if (!event) {
      return Response.json({ error: "No venue credit activity in this transaction" }, { status: 400 });
    }

    const venue = await getVenueByChainId(event.chainVenueId);
    if (!venue) return Response.json({ error: "This venue is not on SplitHub" }, { status: 404 });

    let stallId: number | null = null;
    if (event.kind === "spend") {
      const { data: stall } = await supabase
        .from("venue_stalls")
        .select("id")
        .eq("id", event.stallId)
        .eq("venue_id", venue.id)
        .maybeSingle();
      stallId = stall?.id ?? null;
    }

    const guest = event.guest.toLowerCase();
    await ensureUserExists(guest);

    const usdcAmount = event.kind === "spend" ? null : Number(formatUnits(event.usdcAmount, TOKEN_DECIMALS.USDC));
    const { data: activity, error } = await supabase
      .from("venue_credit_activity")
      .insert({
        venue_id: venue.id,
        stall_id: stallId,
        guest_wallet: guest,
        kind: event.kind,
        credits: Number(formatUnits(event.credits, CREDIT_DECIMALS)),
        usdc_amount: usdcAmount,
        tx_hash: txHash.toLowerCase(),
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") {
        return Response.json({ error: "This transaction has already been recorded" }, { status: 409 });
      }
      throw new Error(error.message);
    }

    // A top-up is real USDC leaving the guest's wallet, so circles split it like any other payment.
    const circleSplit =
      event.kind === "topup"
        ? await safeProcessCircleAutoSplit({
            userWallet: guest,
            amount: event.usdcAmount.toString(),
            tokenAddress: TOKENS.USDC,
            decimals: TOKEN_DECIMALS.USDC,
          })
        : null;

    return Response.json({ activity, circleSplit }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to record venue activity");
  }
}

export const Route = createFileRoute("/api/venues/activity")({
  server: { handlers: { POST: ({ request }) => POST(request) } },
});

import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "~~/lib/supabase";

/**
 * POST /api/settlements
 * Records a completed settlement in the database
 */
async function POST(request: Request) {
  try {
    const body = await request.json();
    const { payerWallet, payeeWallet, amount, tokenAddress, txHash } = body;

    // Validate required fields
    if (!payerWallet || !payeeWallet || !amount || !tokenAddress || !txHash) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Normalize wallet addresses to lowercase
    const normalizedPayerWallet = payerWallet.toLowerCase();
    const normalizedPayeeWallet = payeeWallet.toLowerCase();

    // Insert settlement record
    const { data, error } = await supabase
      .from("settlements")
      .insert({
        payer_wallet: normalizedPayerWallet,
        payee_wallet: normalizedPayeeWallet,
        amount: parseFloat(amount),
        token_address: tokenAddress.toLowerCase(),
        tx_hash: txHash,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert settlement: ${error.message}`);
    }

    return Response.json({ success: true, settlement: data });
  } catch (error) {
    console.error("Error recording settlement:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to record settlement" },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/settlements")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

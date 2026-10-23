import { createFileRoute } from "@tanstack/react-router";
import { type Address, type Hex, isAddress, isHash, parseUnits } from "viem";
import { createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { ERC20_ABI } from "~~/lib/contractAbis";
import { supabase } from "~~/lib/supabase";
import { verifyPaymentTx } from "~~/lib/tapPayment";

/**
 * POST /api/settlements
 * Records a completed settlement once `txHash` is verified to contain the matching SplitHubPayments
 * transfer (payer → payee, token, amount). Each (tx, payer, payee) is recorded once.
 */
async function POST(request: Request) {
  try {
    const body = await request.json();
    const { payerWallet, payeeWallet, amount, tokenAddress, txHash } = body;

    if (!payerWallet || !payeeWallet || !amount || !tokenAddress || !txHash) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isAddress(payerWallet) || !isAddress(payeeWallet) || !isAddress(tokenAddress) || !isHash(txHash)) {
      return Response.json({ error: "Invalid addresses or transaction hash" }, { status: 400 });
    }

    const publicClient = createBaseSepoliaPublicClient();
    const decimals = (await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "decimals",
    })) as number;
    await verifyPaymentTx(publicClient, txHash as Hex, {
      payer: payerWallet as Address,
      recipient: payeeWallet as Address,
      token: tokenAddress as Address,
      amount: parseUnits(String(amount), decimals),
    });

    const { data, error } = await supabase
      .from("settlements")
      .insert({
        payer_wallet: payerWallet.toLowerCase(),
        payee_wallet: payeeWallet.toLowerCase(),
        amount: parseFloat(amount),
        token_address: tokenAddress.toLowerCase(),
        tx_hash: txHash,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json({ error: "This settlement is already recorded" }, { status: 409 });
      }
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

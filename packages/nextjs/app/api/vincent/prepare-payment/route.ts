import { NextRequest, NextResponse } from "next/server";
import { prepareJitTapPayment } from "~~/services/jitPaymentService";

/**
 * POST /api/vincent/prepare-payment
 *
 * Just-in-time payment preparation:
 * - enforce the user's tap limit
 * - withdraw exact shortfall from Aave if needed
 * - transfer exact shortfall to the wallet that will actually send the payment
 *
 * Body: { payerWallet, tokenAddress, amount, decimals, limitWallet?, fundingTargetWallet? }
 */
export async function POST(request: NextRequest) {
  try {
    const { payerWallet, tokenAddress, amount, decimals, limitWallet, fundingTargetWallet } = (await request.json()) as {
      payerWallet?: string;
      tokenAddress?: string;
      amount?: string;
      decimals?: number;
      limitWallet?: string;
      fundingTargetWallet?: string;
    };

    if (!payerWallet || !tokenAddress || !amount || typeof decimals !== "number") {
      return NextResponse.json({ error: "Missing payerWallet, tokenAddress, amount, or decimals" }, { status: 400 });
    }

    const result = await prepareJitTapPayment({
      payerWallet,
      tokenAddress,
      amount,
      decimals,
      limitWallet,
      fundingTargetWallet,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare payment" },
      { status: 500 },
    );
  }
}

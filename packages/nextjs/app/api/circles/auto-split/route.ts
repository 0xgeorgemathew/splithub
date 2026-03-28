import { NextRequest, NextResponse } from "next/server";
import { safeProcessCircleAutoSplit } from "~~/services/circleAutoSplitService";

export const dynamic = "force-dynamic";

interface AutoSplitRequest {
  userWallet: string;
  amount: string;
  tokenAddress: string;
  decimals?: number;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AutoSplitRequest;

    if (!body.userWallet || !body.amount || !body.tokenAddress) {
      return NextResponse.json(
        { error: "Missing required fields: userWallet, amount, tokenAddress" },
        { status: 400 },
      );
    }

    const result = await safeProcessCircleAutoSplit({
      userWallet: body.userWallet,
      amount: body.amount,
      tokenAddress: body.tokenAddress,
      decimals: body.decimals,
      description: body.description,
    });

    return NextResponse.json({
      success: true,
      circleSplit: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process auto-split";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

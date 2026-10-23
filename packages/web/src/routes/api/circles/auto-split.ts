import { createFileRoute } from "@tanstack/react-router";
import { safeProcessCircleAutoSplit } from "~~/services/circleAutoSplitService";

interface AutoSplitRequest {
  userWallet: string;
  amount: string;
  tokenAddress: string;
  decimals?: number;
  description?: string;
}

async function POST(request: Request) {
  try {
    const body = (await request.json()) as AutoSplitRequest;

    if (!body.userWallet || !body.amount || !body.tokenAddress) {
      return Response.json({ error: "Missing required fields: userWallet, amount, tokenAddress" }, { status: 400 });
    }

    const result = await safeProcessCircleAutoSplit({
      userWallet: body.userWallet,
      amount: body.amount,
      tokenAddress: body.tokenAddress,
      decimals: body.decimals,
      description: body.description,
    });

    return Response.json({
      success: true,
      circleSplit: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process auto-split";
    return Response.json({ error: message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/circles/auto-split")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

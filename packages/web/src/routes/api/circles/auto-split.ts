import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, requireUser } from "~~/lib/auth";
import { safeProcessCircleAutoSplit } from "~~/services/circleAutoSplitService";

interface AutoSplitRequest {
  amount: string;
  tokenAddress: string;
  decimals?: number;
  description?: string;
}

/** Splits the signed-in user's own purchase across their active circle. */
async function POST(request: Request) {
  try {
    const { wallet } = await requireUser(request);
    const body = (await request.json()) as AutoSplitRequest;

    if (!body.amount || !body.tokenAddress) {
      return Response.json({ error: "Missing required fields: amount, tokenAddress" }, { status: 400 });
    }

    const result = await safeProcessCircleAutoSplit({
      userWallet: wallet,
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
    return errorResponse(error, "Failed to process auto-split");
  }
}

export const Route = createFileRoute("/api/circles/auto-split")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

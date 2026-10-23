import { createFileRoute } from "@tanstack/react-router";
import { type Address, maxUint256 } from "viem";
import { TOKENS } from "~~/config/tokens";
import { errorResponse, requireUser } from "~~/lib/auth";
import { createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { ERC20_ABI } from "~~/lib/contractAbis";
import { supabase } from "~~/lib/supabase";
import { PAYMENTS_ADDRESS } from "~~/lib/tapPayment";

/**
 * POST /api/user/approval: marks onboarding approvals complete for the signed-in user once their wallet's
 * USDC allowance for SplitHubPayments is in place onchain.
 */
async function POST(request: Request) {
  try {
    const { wallet } = await requireUser(request);
    const allowance = (await createBaseSepoliaPublicClient().readContract({
      address: TOKENS.USDC,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [wallet as Address, PAYMENTS_ADDRESS],
    })) as bigint;
    if (allowance === 0n) {
      return Response.json({ error: "Approve USDC for SplitHub payments first" }, { status: 409 });
    }

    const { error } = await supabase
      .from("users")
      .update({ approval_status: "completed" })
      .eq("wallet_address", wallet);
    if (error) throw new Error(error.message);
    return Response.json({ success: true, unlimited: allowance === maxUint256 });
  } catch (error) {
    return errorResponse(error, "Failed to update approval status");
  }
}

export const Route = createFileRoute("/api/user/approval")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

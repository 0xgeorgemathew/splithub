import { createFileRoute } from "@tanstack/react-router";
import { type Address, isAddress, isAddressEqual } from "viem";
import { AuthError, errorResponse, requireUser } from "~~/lib/auth";
import { createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { supabase } from "~~/lib/supabase";
import { resolveChipOwner } from "~~/lib/tapPayment";

interface FinalizeRequest {
  action: "skip" | "register";
  chipAddress?: string;
}

interface FinalizeResponse {
  nextRoute: "/approve" | "/splits";
  status: "ok" | "needs_action";
  action?: {
    type: string;
    message: string;
  };
}

/**
 * POST /api/onboarding/finalize
 *
 * Atomic endpoint for finalizing onboarding after skip/register actions.
 * Performs all necessary backend checks and returns the next route.
 *
 * This prevents multiple redirects and flashing screens by consolidating
 * all onboarding logic into a single API call.
 */
async function POST(request: Request) {
  try {
    const { privyUserId: userId, wallet } = await requireUser(request);
    const body: FinalizeRequest = await request.json();
    const { action, chipAddress } = body;

    if (action !== "skip" && action !== "register") {
      return Response.json({ error: "action must be 'skip' or 'register'" }, { status: 400 });
    }

    if (action === "register" && (!chipAddress || !isAddress(chipAddress))) {
      return Response.json({ error: "chipAddress is required for register action" }, { status: 400 });
    }
    if (action === "register") {
      // The chip registry onchain is the source of truth: only record a chip registered to this wallet.
      const owner = await resolveChipOwner(createBaseSepoliaPublicClient(), chipAddress as Address).catch(() => null);
      if (!owner || !isAddressEqual(owner, wallet as Address)) {
        throw new AuthError("This chip is not registered to your wallet", 403);
      }
    }

    // Emit telemetry event
    const startTime = Date.now();
    console.log(`[onboarding_${action}_initiated]`, { user_id: userId });

    // Update user record based on action
    const updateData: {
      chip_registration_status: "skipped" | "registered";
      chip_address?: string;
    } = {
      chip_registration_status: action === "skip" ? "skipped" : "registered",
    };

    if (action === "register" && chipAddress) {
      updateData.chip_address = chipAddress.toLowerCase();
    }

    const { error: updateError, data: userData } = await supabase
      .from("users")
      .update(updateData)
      .eq("privy_user_id", userId)
      .select("approval_status")
      .single();

    if (updateError) {
      console.error(`[onboarding_finalize_failure]`, {
        user_id: userId,
        auth_provider: "twitter",
        duration_ms: Date.now() - startTime,
        result: "db_update_failed",
        error: updateError.message,
      });
      return Response.json({ error: "Failed to update user record" }, { status: 500 });
    }

    // Determine next route based on approval status
    const hasApprovals = userData?.approval_status === "completed";
    const nextRoute: "/approve" | "/splits" = hasApprovals ? "/splits" : "/approve";

    // Emit success telemetry
    console.log(`[onboarding_finalize_success]`, {
      user_id: userId,
      auth_provider: "twitter",
      duration_ms: Date.now() - startTime,
      result: "success",
      next_route: nextRoute,
    });

    const response: FinalizeResponse = {
      nextRoute,
      status: "ok",
    };

    return Response.json(response);
  } catch (error: unknown) {
    return errorResponse(error, "[onboarding_finalize_failure]");
  }
}

export const Route = createFileRoute("/api/onboarding/finalize")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

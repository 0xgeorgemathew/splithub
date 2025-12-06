import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~~/lib/supabase";

export const dynamic = "force-dynamic";

interface FinalizeRequest {
  userId: string;
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
export async function POST(request: NextRequest) {
  try {
    const body: FinalizeRequest = await request.json();
    const { userId, action, chipAddress } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (action !== "skip" && action !== "register") {
      return NextResponse.json({ error: "action must be 'skip' or 'register'" }, { status: 400 });
    }

    if (action === "register" && !chipAddress) {
      return NextResponse.json({ error: "chipAddress is required for register action" }, { status: 400 });
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
      return NextResponse.json({ error: "Failed to update user record" }, { status: 500 });
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

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[onboarding_finalize_failure]", {
      error: error.message,
      result: "unexpected_error",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

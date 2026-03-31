import { NextRequest, NextResponse } from "next/server";
import { VincentAuthenticationError, getOptionalVincentConfigFromEnv, requireVincentAppUser } from "~~/lib/vincent";

/**
 * GET /api/vincent/secret
 *
 * Returns the status of the shared SplitHub Vincent Smart Wallet.
 * This is the operator/admin endpoint that shows whether the Vincent
 * secret is configured and resolves the wallet addresses.
 */
export async function GET() {
  try {
    const config = getOptionalVincentConfigFromEnv();
    if (!config) {
      return NextResponse.json({
        status: "not_configured",
        message: "Vincent delegatee key not set",
      });
    }

    return NextResponse.json({
      status: "configured",
      delegateeAddress: config.delegateeAddress,
      appId: config.appId,
    });
  } catch (error) {
    console.error("Vincent secret status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve Vincent wallet" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/vincent/secret
 *
 * Validates a Vincent API key against the current EVM wallet endpoint.
 * In v1 the key is still supplied through environment variables.
 */
export async function POST(request: NextRequest) {
  try {
    const vincentUser = await requireVincentAppUser(request);

    return NextResponse.json({
      status: "validated",
      eoaAddress: vincentUser.pkpAddress,
      smartAccountAddress: vincentUser.agentAddress,
    });
  } catch (error) {
    if (error instanceof VincentAuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Vincent secret validation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Session validation failed" },
      { status: 500 },
    );
  }
}

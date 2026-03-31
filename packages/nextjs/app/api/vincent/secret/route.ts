import { NextRequest, NextResponse } from "next/server";
import { getVincentAgentAccount, getVincentConfigFromEnv } from "~~/lib/vincent";

/**
 * GET /api/vincent/secret
 *
 * Returns the status of the shared SplitHub Vincent Smart Wallet.
 * This is the operator/admin endpoint that shows whether the Vincent
 * secret is configured and resolves the wallet addresses.
 */
export async function GET() {
  try {
    let config;
    try {
      config = getVincentConfigFromEnv();
    } catch {
      return NextResponse.json({
        status: "not_configured",
        message: "VINCENT_API_KEY not set",
      });
    }

    const account = await getVincentAgentAccount(config);

    return NextResponse.json({
      status: "configured",
      eoaAddress: account.eoaAddress,
      smartAccountAddress: account.smartAccountAddress,
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
    const body = await request.json();
    const { apiKey } = body as { apiKey?: string };

    if (!apiKey || !apiKey.startsWith("ssk_")) {
      return NextResponse.json({ error: "Invalid API key format — expected ssk_xxx" }, { status: 400 });
    }

    const account = await getVincentAgentAccount({ apiKey });

    return NextResponse.json({
      status: "validated",
      eoaAddress: account.eoaAddress,
      smartAccountAddress: account.smartAccountAddress,
    });
  } catch (error) {
    console.error("Vincent secret validation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Key validation failed" },
      { status: 500 },
    );
  }
}

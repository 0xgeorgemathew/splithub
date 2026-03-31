import { NextRequest, NextResponse } from "next/server";
import { VincentAuthenticationError, getOptionalVincentConfigFromEnv, requireVincentAppUser } from "~~/lib/vincent";

export async function GET(request: NextRequest) {
  try {
    const config = getOptionalVincentConfigFromEnv();
    if (!config) {
      return NextResponse.json({
        status: "not_configured",
        configured: false,
        authenticated: false,
      });
    }

    try {
      const session = await requireVincentAppUser(request);
      return NextResponse.json({
        status: "authenticated",
        configured: true,
        authenticated: true,
        appId: config.appId,
        delegateeAddress: config.delegateeAddress,
        pkpAddress: session.pkpAddress,
        agentAddress: session.agentAddress,
      });
    } catch (error) {
      if (error instanceof VincentAuthenticationError) {
        return NextResponse.json({
          status: "needs_connect",
          configured: true,
          authenticated: false,
          appId: config.appId,
          delegateeAddress: config.delegateeAddress,
          error: error.message,
        });
      }

      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        configured: false,
        authenticated: false,
        error: error instanceof Error ? error.message : "Failed to resolve Vincent session",
      },
      { status: 500 },
    );
  }
}

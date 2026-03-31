import { NextRequest, NextResponse } from "next/server";
import {
  getRequestOrigin,
  getReturnToFromRequest,
  getVincentAppOrigin,
  getVincentCallbackUrl,
  getVincentConfigFromEnv,
  getVincentConnectUrl,
  setVincentReturnToCookie,
} from "~~/lib/vincent";

export async function GET(request: NextRequest) {
  try {
    const config = getVincentConfigFromEnv();
    const returnTo = getReturnToFromRequest(request);
    const requestOrigin = getRequestOrigin(request);
    const publicAppOrigin = getVincentAppOrigin(requestOrigin);

    if (publicAppOrigin !== requestOrigin) {
      const redirectUrl = new URL("/api/vincent/connect", publicAppOrigin);
      redirectUrl.searchParams.set("returnTo", returnTo);
      return NextResponse.redirect(redirectUrl);
    }

    const response = NextResponse.redirect(
      getVincentConnectUrl({
        appId: config.appId,
        redirectUri: getVincentCallbackUrl(publicAppOrigin),
      }),
    );

    setVincentReturnToCookie(response, returnTo);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vincent is not configured" },
      { status: 500 },
    );
  }
}

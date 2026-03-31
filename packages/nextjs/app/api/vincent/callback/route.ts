import { NextRequest, NextResponse } from "next/server";
import {
  VINCENT_CONNECT_JWT_QUERY_PARAM,
  clearVincentSession,
  getRequestOrigin,
  getVincentAppOrigin,
  getVincentStoredReturnTo,
  setVincentSessionCookie,
  verifyVincentJwtForRequest,
} from "~~/lib/vincent";

function buildRedirectUrl(request: NextRequest, path: string, error?: string) {
  const url = new URL(path, getVincentAppOrigin(getRequestOrigin(request)));
  if (error) {
    url.searchParams.set("vincentError", error);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const jwt = request.nextUrl.searchParams.get(VINCENT_CONNECT_JWT_QUERY_PARAM);
  const returnTo = getVincentStoredReturnTo(request);

  if (!jwt) {
    return NextResponse.redirect(buildRedirectUrl(request, returnTo, "missing_jwt"));
  }

  try {
    const decodedJwt = await verifyVincentJwtForRequest(request, jwt);
    const response = NextResponse.redirect(buildRedirectUrl(request, returnTo));
    setVincentSessionCookie(response, { jwt, decodedJwt });
    response.cookies.delete("splithub_vincent_return_to");
    return response;
  } catch (error) {
    const response = NextResponse.redirect(buildRedirectUrl(request, returnTo, "connect_failed"));
    clearVincentSession(response);
    if (error instanceof Error) {
      console.error("Vincent callback error:", error.message);
    }
    return response;
  }
}

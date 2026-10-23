/**
 * Server-side authentication for API routes.
 *
 * Browser code sends the Privy access token (`Authorization: Bearer <token>`, see lib/apiFetch.ts). We verify
 * it against Privy's JWKS and map the Privy user to their SplitHub wallet through `users.privy_user_id`.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import { supabase } from "~~/lib/supabase";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string;
const jwks = createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`));

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
  }
}

export type AuthedUser = { privyUserId: string; wallet: string };

/** Verifies the request's Privy token and returns the caller's wallet; throws AuthError otherwise. */
export async function requireUser(request: Request): Promise<AuthedUser> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new AuthError("Sign in to continue", 401);

  let privyUserId: string;
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: "privy.io", audience: PRIVY_APP_ID });
    privyUserId = String(payload.sub);
  } catch {
    throw new AuthError("Your session has expired. Sign in again.", 401);
  }

  const { data: user } = await supabase
    .from("users")
    .select("wallet_address")
    .eq("privy_user_id", privyUserId)
    .maybeSingle();
  if (!user?.wallet_address) throw new AuthError("Finish setting up your account first", 403);

  return { privyUserId, wallet: user.wallet_address.toLowerCase() };
}

export function sameWallet(a?: string | null, b?: string | null) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

/** JSON error response for a thrown error, using the AuthError status when there is one. */
export function errorResponse(error: unknown, fallback: string) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(fallback, error);
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 });
}

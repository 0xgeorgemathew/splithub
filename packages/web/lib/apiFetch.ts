import { getAccessToken } from "@privy-io/react-auth";

/** fetch() for SplitHub API routes that need the signed-in user (sends the Privy access token). */
export async function apiFetch(input: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(input, { ...init, headers });
}

import type { User as PrivyUser } from "@privy-io/react-auth";
import { type AccountSyncBody, accountLinkMessage } from "~~/lib/accountLink";
import { apiFetch } from "~~/lib/apiFetch";
import type { User } from "~~/lib/supabase";

type SignWithWallet = (message: string, address: string) => Promise<string>;

/**
 * Creates or refreshes the signed-in user's SplitHub row through /api/user/sync. The first time, the
 * server asks for proof that the embedded wallet belongs to this Privy account, and `sign` provides it.
 */
export async function syncAccount(privyUser: PrivyUser, sign: SignWithWallet): Promise<User> {
  const body: AccountSyncBody = {
    twitter: privyUser.twitter
      ? {
          username: privyUser.twitter.username,
          name: privyUser.twitter.name,
          profilePictureUrl: privyUser.twitter.profilePictureUrl,
          subject: privyUser.twitter.subject,
        }
      : undefined,
  };

  const post = (payload: AccountSyncBody) =>
    apiFetch("/api/user/sync", { method: "POST", body: JSON.stringify(payload) });

  let response = await post(body);
  if (response.status === 428) {
    const wallet = privyUser.wallet?.address;
    if (!wallet) throw new Error("No embedded wallet found");
    const issuedAt = new Date().toISOString();
    const signature = await sign(accountLinkMessage(privyUser.id, wallet, issuedAt), wallet);
    response = await post({ ...body, link: { wallet, issuedAt, signature } });
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Account sync failed");
  return result.user as User;
}

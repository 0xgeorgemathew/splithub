/**
 * Message a user's embedded wallet signs to link it to their Privy account (see /api/user/sync).
 * Shared by the client (signs it) and the server (rebuilds and verifies it).
 */
export const LINK_MAX_AGE_MS = 10 * 60 * 1000;

export function accountLinkMessage(privyUserId: string, wallet: string, issuedAt: string) {
  return [
    "Link this wallet to your SplitHub account.",
    "",
    `Account: ${privyUserId}`,
    `Wallet: ${wallet.toLowerCase()}`,
    `Issued: ${issuedAt}`,
  ].join("\n");
}

export type AccountSyncBody = {
  name?: string | null;
  twitter?: {
    username?: string | null;
    name?: string | null;
    profilePictureUrl?: string | null;
    subject?: string | null;
  };
  link?: { wallet: string; issuedAt: string; signature: string };
};

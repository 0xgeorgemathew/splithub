import { createFileRoute } from "@tanstack/react-router";
import { type Hex, isAddress, verifyMessage } from "viem";
import { type AccountSyncBody, LINK_MAX_AGE_MS, accountLinkMessage } from "~~/lib/accountLink";
import { errorResponse, verifyPrivyRequest } from "~~/lib/auth";
import { supabase } from "~~/lib/supabase";

function profileFields(body: AccountSyncBody) {
  const twitter = body.twitter ?? {};
  return {
    twitter_handle: twitter.username || null,
    twitter_profile_url: twitter.profilePictureUrl || null,
    twitter_user_id: twitter.subject || null,
    name: twitter.name || twitter.username || body.name || null,
  };
}

/**
 * POST /api/user/sync: creates or refreshes the signed-in user's row.
 *
 * The Privy user id comes from the verified access token. Linking it to a wallet the first time requires a
 * signature from that wallet over accountLinkMessage(), and a wallet already linked to another Privy user
 * is never re-linked. Responds 428 with `needsLink` when the client must sign.
 */
async function POST(request: Request) {
  try {
    const privyUserId = await verifyPrivyRequest(request);
    const body = (await request.json()) as AccountSyncBody;
    const profile = profileFields(body);

    const { data: existing } = await supabase.from("users").select("*").eq("privy_user_id", privyUserId).maybeSingle();
    if (existing) {
      const { data, error } = await supabase
        .from("users")
        .update({ ...profile, name: profile.name || existing.name })
        .eq("privy_user_id", privyUserId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return Response.json({ user: data });
    }

    const link = body.link;
    if (!link) return Response.json({ needsLink: true }, { status: 428 });
    if (!isAddress(link.wallet)) return Response.json({ error: "Invalid wallet" }, { status: 400 });

    const issued = Date.parse(link.issuedAt);
    if (!Number.isFinite(issued) || Math.abs(Date.now() - issued) > LINK_MAX_AGE_MS) {
      return Response.json({ needsLink: true, error: "Link signature expired" }, { status: 428 });
    }
    const wallet = link.wallet.toLowerCase();
    const valid = await verifyMessage({
      address: link.wallet,
      message: accountLinkMessage(privyUserId, wallet, link.issuedAt),
      signature: link.signature as Hex,
    }).catch(() => false);
    if (!valid) return Response.json({ error: "Wallet signature does not match" }, { status: 401 });

    const { data: walletRow } = await supabase.from("users").select("*").eq("wallet_address", wallet).maybeSingle();
    if (walletRow?.privy_user_id && walletRow.privy_user_id !== privyUserId) {
      return Response.json({ error: "This wallet is already linked to another account" }, { status: 409 });
    }

    const name = profile.name || walletRow?.name || `User ${wallet.slice(0, 6)}`;
    const { data, error } = walletRow
      ? await supabase
          .from("users")
          .update({ ...profile, name, privy_user_id: privyUserId })
          .eq("wallet_address", wallet)
          .select()
          .single()
      : await supabase
          .from("users")
          .insert({
            ...profile,
            name,
            privy_user_id: privyUserId,
            wallet_address: wallet,
            email: null,
            chip_address: null,
          })
          .select()
          .single();
    if (error) throw new Error(error.message);
    return Response.json({ user: data });
  } catch (err) {
    return errorResponse(err, "Sync failed");
  }
}

export const Route = createFileRoute("/api/user/sync")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

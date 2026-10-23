import { type Address, type Hex, isHash } from "viem";
import { AuthError, requireUser, sameWallet } from "~~/lib/auth";
import { createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { readVenueCreditTx } from "~~/lib/venueCredits";
import { getVenueById } from "~~/services/venueService";

/** Signed-in caller who owns the venue; throws AuthError otherwise. */
export async function requireVenueOwner(request: Request, venueId: number) {
  const { wallet } = await requireUser(request);
  const venue = await getVenueById(venueId);
  if (!venue) throw new AuthError("Venue not found", 403);
  if (!sameWallet(venue.owner_wallet, wallet)) throw new AuthError("Only the venue owner can change it", 403);
  return { wallet, venue };
}

/** The on-chain venue id from a createVenue transaction the caller sent from their own wallet. */
export async function readCreatedChainVenue(txHash: unknown, wallet: string) {
  if (typeof txHash !== "string" || !isHash(txHash)) throw new Error("A createVenue transaction hash is required");
  const { events } = await readVenueCreditTx(createBaseSepoliaPublicClient(), txHash as Hex, {
    submitter: wallet as Address,
  });
  const created = events.find(event => event.kind === "created");
  if (!created || created.kind !== "created" || !sameWallet(created.owner, wallet)) {
    throw new Error("That transaction did not register a venue for your wallet");
  }
  return created.chainVenueId;
}

import { supabase } from "~~/lib/supabase";
import type { Venue, VenueCreditActivity, VenueStall } from "~~/lib/venue.types";

const OWNER_EMBED = "owner_user:users!owner_wallet(name, twitter_handle, twitter_profile_url)";
export const ACTIVITY_SELECT =
  "*, guest_user:users!guest_wallet(name, twitter_handle, twitter_profile_url), stall:venue_stalls!stall_id(stall_name)";

/** Reserved by the top-up terminal route (/venues/$venueSlug/topup). */
export const RESERVED_STALL_SLUGS = ["topup"];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Slug that is free in `taken`, adding -2, -3... when needed. */
export function uniqueSlug(base: string, taken: string[]) {
  const root = slugify(base) || "venue";
  let slug = root;
  for (let n = 2; taken.includes(slug) || RESERVED_STALL_SLUGS.includes(slug); n++) slug = `${root}-${n}`;
  return slug;
}

/** Stall price in credits from a request body; null means the terminal enters the amount. */
export function parseCreditPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) throw new Error("Credit price must be a positive number");
  return Math.round(price * 100) / 100;
}

export async function listPublicVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from("venues")
    .select(`*, ${OWNER_EMBED}, venue_stalls(*)`)
    .eq("status", "active")
    .not("chain_venue_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Failed to load venues: ${error.message}`);
  return (data ?? []) as Venue[];
}

export async function listVenuesByOwner(ownerWallet: string): Promise<Venue[]> {
  const { data, error } = await supabase
    .from("venues")
    .select(`*, ${OWNER_EMBED}, venue_stalls(*)`)
    .eq("owner_wallet", ownerWallet.toLowerCase())
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load venues: ${error.message}`);
  return (data ?? []) as Venue[];
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const { data } = await supabase
    .from("venues")
    .select(`*, ${OWNER_EMBED}, venue_stalls(*)`)
    .eq("venue_slug", slug)
    .maybeSingle();
  if (!data) return null;
  const venue = data as Venue;
  venue.venue_stalls?.sort((a, b) => a.id - b.id);
  return venue;
}

export async function getVenueById(id: number): Promise<Venue | null> {
  const { data } = await supabase.from("venues").select("*").eq("id", id).maybeSingle();
  return (data as Venue | null) ?? null;
}

export async function getVenueByChainId(chainVenueId: number): Promise<Venue | null> {
  const { data } = await supabase.from("venues").select("*").eq("chain_venue_id", chainVenueId).maybeSingle();
  return (data as Venue | null) ?? null;
}

export async function getStallWithVenue(stallId: number): Promise<(VenueStall & { venue: Venue }) | null> {
  const { data } = await supabase
    .from("venue_stalls")
    .select("*, venue:venues!venue_id(*)")
    .eq("id", stallId)
    .maybeSingle();
  return (data as (VenueStall & { venue: Venue }) | null) ?? null;
}

export async function getVenueActivity(venueId: number, limit = 50): Promise<VenueCreditActivity[]> {
  const { data, error } = await supabase
    .from("venue_credit_activity")
    .select(ACTIVITY_SELECT)
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load venue activity: ${error.message}`);
  return (data ?? []) as VenueCreditActivity[];
}

export type VenueTotals = {
  usdcToppedUp: number;
  creditsSold: number;
  creditsSpent: number;
  creditsRefunded: number;
  guests: number;
  spentByStall: Record<number, number>;
  /** Credits each guest still holds, from the recorded activity (the contract balance is authoritative). */
  guestBalances: Record<string, number>;
};

export async function getVenueTotals(venueId: number): Promise<VenueTotals> {
  const { data, error } = await supabase
    .from("venue_credit_activity")
    .select("kind, credits, usdc_amount, guest_wallet, stall_id")
    .eq("venue_id", venueId);
  if (error) throw new Error(`Failed to load venue totals: ${error.message}`);

  const totals: VenueTotals = {
    usdcToppedUp: 0,
    creditsSold: 0,
    creditsSpent: 0,
    creditsRefunded: 0,
    guests: 0,
    spentByStall: {},
    guestBalances: {},
  };
  for (const row of (data ?? []) as Pick<
    VenueCreditActivity,
    "kind" | "credits" | "usdc_amount" | "guest_wallet" | "stall_id"
  >[]) {
    const balance = totals.guestBalances[row.guest_wallet] ?? 0;
    if (row.kind === "topup") {
      totals.usdcToppedUp += row.usdc_amount ?? 0;
      totals.creditsSold += row.credits;
      totals.guestBalances[row.guest_wallet] = balance + row.credits;
    } else if (row.kind === "spend") {
      totals.creditsSpent += row.credits;
      totals.guestBalances[row.guest_wallet] = balance - row.credits;
      if (row.stall_id) totals.spentByStall[row.stall_id] = (totals.spentByStall[row.stall_id] ?? 0) + row.credits;
    } else {
      totals.creditsRefunded += row.credits;
      totals.guestBalances[row.guest_wallet] = 0;
    }
  }
  totals.guests = Object.keys(totals.guestBalances).length;
  return totals;
}

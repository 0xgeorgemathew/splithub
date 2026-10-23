type UserSummary = {
  name: string;
  twitter_handle?: string | null;
  twitter_profile_url?: string | null;
};

/** A closed-loop venue: guests top up its credits with USDC and spend them at its stalls. */
export type Venue = {
  id: number;
  created_at: string;
  updated_at: string;
  venue_name: string;
  venue_slug: string;
  venue_description: string | null;
  owner_wallet: string;
  status: "active" | "paused";
  /** VenueCredits venue id; null until the owner registers the venue on-chain. */
  chain_venue_id: number | null;
  owner_user?: UserSummary | null;
  venue_stalls?: VenueStall[];
};

export type VenueStall = {
  id: number;
  created_at: string;
  updated_at: string;
  venue_id: number;
  stall_name: string;
  stall_slug: string;
  stall_description: string | null;
  /** Fixed price in credits; null lets the terminal enter any amount. */
  credit_price: number | null;
  status: "active" | "paused";
};

export type VenueCreditActivity = {
  id: number;
  created_at: string;
  venue_id: number;
  stall_id: number | null;
  guest_wallet: string;
  kind: "topup" | "spend" | "refund";
  credits: number;
  usdc_amount: number | null;
  tx_hash: string;
  guest_user?: UserSummary | null;
  stall?: { stall_name: string } | null;
};

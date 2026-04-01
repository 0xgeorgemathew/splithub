import { ensureUserExists } from "../userService";
import { isAddress } from "viem";
import { TOKENS, TOKEN_DECIMALS } from "~~/config/tokens";
import type { Event } from "~~/lib/events.types";
import type { CreateStoreInput } from "~~/lib/store.types";
import type { User } from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

export const MICRO_MULTIPLIER = 10 ** TOKEN_DECIMALS.USDC;
export const DEFAULT_NETWORK_NAME = "SplitHub Retail Network";
export const DEMO_OPERATOR_WALLET = "0xaB8AB9c654b73b7C253CF6Cc7333880736981742";

export const toMicros = (value: number | string): number => {
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Math.round(parsed * MICRO_MULTIPLIER);
};

export const fromMicros = (value: number): string => {
  return (value / MICRO_MULTIPLIER).toFixed(TOKEN_DECIMALS.USDC);
};

export const createSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

export const normalizeAddress = (value: string) => value.toLowerCase();

export const DEFAULT_STORE_TOKEN = TOKENS.USDC;
export const resolveStoreOperatorWallet = () => normalizeAddress(DEMO_OPERATOR_WALLET);

export async function findOrCreateNetwork(
  adminWallet: string,
  networkName?: string,
  networkSlug?: string,
): Promise<Event> {
  const ownerWallet = normalizeAddress(adminWallet);
  await ensureUserExists(ownerWallet);

  const slug = createSlug(networkSlug || networkName || DEFAULT_NETWORK_NAME);
  const name = networkName?.trim() || DEFAULT_NETWORK_NAME;

  const { data: existing } = await supabase
    .from("events")
    .select("*")
    .eq("owner_wallet", ownerWallet)
    .eq("event_slug", slug)
    .single();

  if (existing) {
    return existing as Event;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      owner_wallet: ownerWallet,
      event_name: name,
      event_slug: slug,
      event_description: `${name} retail network`,
      status: "active",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create network: ${error?.message}`);
  }

  return data as Event;
}

export async function resolveManager(input: CreateStoreInput): Promise<User | null> {
  if (input.managerWallet && isAddress(input.managerWallet)) {
    return await ensureUserExists(input.managerWallet);
  }

  if (input.managerTwitterHandle) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("twitter_handle", input.managerTwitterHandle.replace(/^@/, ""))
      .single();

    return (data as User) || null;
  }

  return null;
}

export async function getStoreRecordById(stallId: number) {
  const { data: store, error } = await supabase
    .from("stalls")
    .select(
      `
      *,
      event:events!event_id(*)
    `,
    )
    .eq("id", stallId)
    .single();

  if (error || !store) {
    throw new Error(`Store not found: ${error?.message}`);
  }

  return store as any;
}

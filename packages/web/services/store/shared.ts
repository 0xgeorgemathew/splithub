import { TOKENS, TOKEN_DECIMALS } from "~~/config/tokens";
import type { Store } from "~~/lib/store.types";
import { supabase } from "~~/lib/supabase";

export const MICRO_MULTIPLIER = 10 ** TOKEN_DECIMALS.USDC;

/** Stores price and take payment in USDC. */
export const STORE_TOKEN = TOKENS.USDC;

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
    .slice(0, 50)
    .replace(/-$/, "");

export async function getStoreById(storeId: number): Promise<Store | null> {
  if (!Number.isInteger(storeId)) return null;
  const { data } = await supabase.from("stores").select("*").eq("id", storeId).maybeSingle();
  return (data as Store) || null;
}

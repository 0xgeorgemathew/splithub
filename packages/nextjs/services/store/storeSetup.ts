import { createSlug, findOrCreateNetwork, normalizeAddress, resolveManager } from "./shared";
import type { Event, Stall } from "~~/lib/events.types";
import type { CreateStoreInput } from "~~/lib/store.types";
import { supabase } from "~~/lib/supabase";

/**
 * Creates a store inside one of the admin's networks. Checkout pays the store manager's wallet, so the
 * manager defaults to the admin when no other manager is given.
 */
export async function createStore(input: CreateStoreInput): Promise<{ network: Event; store: Stall }> {
  const network = await findOrCreateNetwork(input.adminWallet, input.networkName, input.networkSlug);
  const manager = await resolveManager(input);
  const operatorWallet = normalizeAddress(manager?.wallet_address || input.managerWallet || input.adminWallet);

  const { data: store, error } = await supabase
    .from("stalls")
    .insert({
      event_id: network.id,
      stall_name: input.storeName.trim(),
      stall_slug: createSlug(input.storeSlug || input.storeName),
      stall_description: input.storeDescription || null,
      operator_twitter_handle: manager?.twitter_handle || input.managerTwitterHandle?.replace(/^@/, "") || "unassigned",
      operator_wallet: operatorWallet,
      split_percentage: input.splitPercentage ?? 80,
      status: "active",
      token_address: input.tokenAddress.toLowerCase(),
    })
    .select("*")
    .single();

  if (error || !store) {
    throw new Error(`Failed to create store: ${error?.message}`);
  }

  return { network, store: store as Stall };
}

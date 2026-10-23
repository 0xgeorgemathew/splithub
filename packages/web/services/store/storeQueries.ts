import type { StoreWithCatalog } from "~~/lib/store.types";
import type { StoreItem } from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

const STORE_WITH_CATALOG_SELECT = `
  *,
  owner_user:users!owner_wallet(name, twitter_handle, twitter_profile_url),
  items:store_items(*)
`;

const byCreation = (a: StoreItem, b: StoreItem) => a.created_at.localeCompare(b.created_at) || a.id - b.id;

const withSortedItems = (stores: unknown[]): StoreWithCatalog[] =>
  (stores as StoreWithCatalog[]).map(store => ({ ...store, items: [...(store.items || [])].sort(byCreation) }));

export async function getStoreItems(storeId: number): Promise<StoreItem[]> {
  const { data, error } = await supabase
    .from("store_items")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch store items: ${error.message}`);
  }
  return (data || []) as StoreItem[];
}

export async function getStoreBySlug(storeSlug: string): Promise<StoreWithCatalog | null> {
  const { data: store, error } = await supabase
    .from("stores")
    .select(STORE_WITH_CATALOG_SELECT)
    .eq("store_slug", storeSlug)
    .maybeSingle();

  if (error || !store) return null;
  return withSortedItems([store])[0];
}

/** Open stores anyone can browse, most recently updated first. */
export async function getPublicStores(limit = 24): Promise<StoreWithCatalog[]> {
  const { data, error } = await supabase
    .from("stores")
    .select(STORE_WITH_CATALOG_SELECT)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch stores: ${error.message}`);
  return withSortedItems(data || []);
}

/** Every store the wallet owns, open or paused. */
export async function getStoresOwnedBy(wallet: string): Promise<StoreWithCatalog[]> {
  const { data, error } = await supabase
    .from("stores")
    .select(STORE_WITH_CATALOG_SELECT)
    .eq("owner_wallet", wallet.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch your stores: ${error.message}`);
  return withSortedItems(data || []);
}

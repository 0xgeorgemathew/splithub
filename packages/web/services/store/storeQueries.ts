import type { StoreWithCatalog } from "~~/lib/store.types";
import type { StoreInventory, StoreItem } from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

export type StoreItemWithInventory = StoreItem & {
  inventory?: StoreInventory | null;
};

export async function getStoreItems(stallId: number): Promise<StoreItemWithInventory[]> {
  const { data, error } = await supabase
    .from("store_items")
    .select(
      `
      *,
      inventory:store_inventory(*)
    `,
    )
    .eq("stall_id", stallId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch store items: ${error.message}`);
  }

  return ((data || []) as any[]).map(item => ({
    ...(item as StoreItem),
    inventory: Array.isArray(item.inventory) ? item.inventory[0] : item.inventory,
  }));
}

export async function getStoreBySlugs(networkSlug: string, storeSlug: string): Promise<StoreWithCatalog | null> {
  const { data: store, error } = await supabase
    .from("stalls")
    .select(
      `
      *,
      event:events!event_id!inner(*),
      operator_user:users!operator_wallet(*)
    `,
    )
    .eq("stall_slug", storeSlug)
    .eq("event.event_slug", networkSlug)
    .eq("event.kind", "store_network")
    .maybeSingle();

  if (error || !store) {
    return null;
  }

  const storeId = (store as any).id as number;
  const items = await getStoreItems(storeId);

  return {
    ...(store as any),
    network: (store as any).event,
    manager_user: (store as any).operator_user,
    items,
  } as StoreWithCatalog;
}

export async function getPublicStores(limit = 24): Promise<StoreWithCatalog[]> {
  const { data, error } = await supabase
    .from("stalls")
    .select(
      `
      *,
      event:events!event_id!inner(*),
      operator_user:users!operator_wallet(*)
    `,
    )
    .eq("status", "active")
    .eq("event.kind", "store_network")
    .eq("event.status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch stores: ${error.message}`);
  }

  const stores = ((data || []) as any[]).filter(store => store.event?.status === "active");
  const itemsByStore = await Promise.all(stores.map(store => getStoreItems(store.id)));

  return stores.map((store, index) => ({
    ...store,
    network: store.event,
    manager_user: store.operator_user,
    items: itemsByStore[index],
  })) as StoreWithCatalog[];
}

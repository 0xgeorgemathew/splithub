import type { StoreWithCatalog } from "~~/lib/store.types";
import type { ManagerAgent, StoreInventory, StoreItem } from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

export type StoreItemWithInventory = StoreItem & {
  inventory?: StoreInventory | null;
};

export async function getManagerAgentByStore(stallId: number): Promise<ManagerAgent | null> {
  const { data, error } = await supabase.from("manager_agents").select("*").eq("stall_id", stallId).single();
  if (error || !data) {
    return null;
  }
  return data as ManagerAgent;
}

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
      event:events!event_id(*),
      operator_user:users!operator_wallet(*)
    `,
    )
    .eq("stall_slug", storeSlug)
    .eq("event.event_slug", networkSlug)
    .single();

  if (error || !store) {
    return null;
  }

  const storeId = (store as any).id as number;
  const [items, agent] = await Promise.all([getStoreItems(storeId), getManagerAgentByStore(storeId)]);

  return {
    ...(store as any),
    network: (store as any).event,
    manager_user: (store as any).operator_user,
    items,
    manager_agent: agent,
  } as StoreWithCatalog;
}

export async function getPublicStores(limit = 24): Promise<StoreWithCatalog[]> {
  const { data, error } = await supabase
    .from("stalls")
    .select(
      `
      *,
      event:events!event_id(*),
      operator_user:users!operator_wallet(*)
    `,
    )
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch stores: ${error.message}`);
  }

  const stores = ((data || []) as any[]).filter(store => store.event?.status === "active");
  const itemsByStore = await Promise.all(stores.map(store => getStoreItems(store.id)));
  const agents = await Promise.all(stores.map(store => getManagerAgentByStore(store.id)));

  return stores.map((store, index) => ({
    ...store,
    network: store.event,
    manager_user: store.operator_user,
    items: itemsByStore[index],
    manager_agent: agents[index],
  })) as StoreWithCatalog[];
}

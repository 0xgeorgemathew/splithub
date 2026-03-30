import { type StoreItemWithInventory } from "./storeQueries";
import type { CreateStoreItemInput, UpdateStoreItemInput } from "~~/lib/store.types";
import type { StoreInventory, StoreItem } from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

export async function createStoreItem(
  input: CreateStoreItemInput,
): Promise<StoreItemWithInventory & { inventory: StoreInventory | null }> {
  const { data: item, error } = await supabase
    .from("store_items")
    .insert({
      stall_id: input.stallId,
      sku: input.sku.trim(),
      name: input.name.trim(),
      description: input.description || null,
      price: input.price,
      token_address: input.tokenAddress.toLowerCase(),
      status: "active",
      image_url: input.imageUrl || null,
    })
    .select("*")
    .single();

  if (error || !item) {
    throw new Error(`Failed to create store item: ${error?.message}`);
  }

  const inventory = await upsertStoreInventory(item.id, {
    currentStock: input.currentStock ?? 0,
    reorderThreshold: input.reorderThreshold ?? 3,
    targetStock: input.targetStock ?? 10,
  });

  return {
    ...(item as StoreItem),
    inventory,
  };
}

export async function upsertStoreInventory(
  itemId: number,
  input: {
    currentStock: number;
    reorderThreshold: number;
    targetStock: number;
    lastRestockedAt?: string | null;
  },
): Promise<StoreInventory> {
  const { data, error } = await supabase
    .from("store_inventory")
    .upsert(
      {
        item_id: itemId,
        current_stock: input.currentStock,
        reorder_threshold: input.reorderThreshold,
        target_stock: input.targetStock,
        last_restocked_at: input.lastRestockedAt || null,
      },
      { onConflict: "item_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update inventory: ${error?.message}`);
  }

  return data as StoreInventory;
}

export async function updateStoreItem(
  itemId: number,
  input: UpdateStoreItemInput,
): Promise<StoreItemWithInventory & { inventory: StoreInventory | null }> {
  const itemUpdates: Record<string, any> = {};
  if (input.name !== undefined) itemUpdates.name = input.name;
  if (input.description !== undefined) itemUpdates.description = input.description;
  if (input.price !== undefined) itemUpdates.price = input.price;
  if (input.status !== undefined) itemUpdates.status = input.status;
  if (input.imageUrl !== undefined) itemUpdates.image_url = input.imageUrl;

  let updatedItem: StoreItem | null = null;
  if (Object.keys(itemUpdates).length > 0) {
    const { data, error } = await supabase
      .from("store_items")
      .update(itemUpdates)
      .eq("id", itemId)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(`Failed to update item: ${error?.message}`);
    }
    updatedItem = data as StoreItem;
  }

  let inventory: StoreInventory | null = null;
  if (input.currentStock !== undefined || input.reorderThreshold !== undefined || input.targetStock !== undefined) {
    const { data: existingInventory } = await supabase
      .from("store_inventory")
      .select("*")
      .eq("item_id", itemId)
      .single();
    inventory = await upsertStoreInventory(itemId, {
      currentStock: input.currentStock ?? existingInventory?.current_stock ?? 0,
      reorderThreshold: input.reorderThreshold ?? existingInventory?.reorder_threshold ?? 3,
      targetStock: input.targetStock ?? existingInventory?.target_stock ?? 10,
      lastRestockedAt: existingInventory?.last_restocked_at ?? null,
    });
  } else {
    const { data } = await supabase.from("store_inventory").select("*").eq("item_id", itemId).single();
    inventory = (data as StoreInventory) || null;
  }

  if (!updatedItem) {
    const { data, error } = await supabase.from("store_items").select("*").eq("id", itemId).single();
    if (error || !data) {
      throw new Error(`Failed to reload item: ${error?.message}`);
    }
    updatedItem = data as StoreItem;
  }

  return {
    ...updatedItem,
    inventory,
  };
}

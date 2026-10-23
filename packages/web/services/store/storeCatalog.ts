import type { CreateStoreItemInput, UpdateStoreItemInput } from "~~/lib/store.types";
import type { StoreItem } from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

/**
 * Validates item fields from a request body. Returns the parsed fields or an error message. With
 * `requireCore`, name and price must be present (creating an item).
 */
export function parseStoreItemFields(
  body: Record<string, unknown>,
  requireCore: boolean,
): { fields: UpdateStoreItemInput } | { error: string } {
  const fields: UpdateStoreItemInput = {};

  if (body.name !== undefined || requireCore) {
    if (typeof body.name !== "string" || !body.name.trim()) return { error: "Item name is required" };
    fields.name = body.name;
  }
  if (body.price !== undefined || requireCore) {
    const price = Number(body.price);
    if (body.price === "" || body.price === null || !Number.isFinite(price) || price < 0) {
      return { error: "Price must be zero or more" };
    }
    fields.price = price;
  }
  if (body.stock !== undefined) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) return { error: "Stock must be a whole number, zero or more" };
    fields.stock = stock;
  }
  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== "string") return { error: "Invalid description" };
    fields.description = body.description;
  }
  if (body.imageUrl !== undefined) {
    if (body.imageUrl !== null && typeof body.imageUrl !== "string") return { error: "Invalid image URL" };
    if (body.imageUrl && !/^https?:\/\//i.test(body.imageUrl.trim())) {
      return { error: "Image URL must start with http:// or https://" };
    }
    fields.imageUrl = body.imageUrl;
  }
  if (body.status !== undefined) {
    if (body.status !== "active" && body.status !== "paused") return { error: "Status must be active or paused" };
    fields.status = body.status;
  }
  return { fields };
}

export async function createStoreItem(input: CreateStoreItemInput): Promise<StoreItem> {
  const { data: item, error } = await supabase
    .from("store_items")
    .insert({
      store_id: input.storeId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: input.price,
      stock: input.stock ?? 0,
      status: "active",
      image_url: input.imageUrl?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !item) {
    throw new Error(`Failed to create store item: ${error?.message}`);
  }
  return item as StoreItem;
}

export async function updateStoreItem(itemId: number, input: UpdateStoreItemInput): Promise<StoreItem> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.description !== undefined) updates.description = input.description?.trim() || null;
  if (input.price !== undefined) updates.price = input.price;
  if (input.stock !== undefined) updates.stock = input.stock;
  if (input.status !== undefined) updates.status = input.status;
  if (input.imageUrl !== undefined) updates.image_url = input.imageUrl?.trim() || null;

  const query = Object.keys(updates).length
    ? supabase.from("store_items").update(updates).eq("id", itemId).select("*").single()
    : supabase.from("store_items").select("*").eq("id", itemId).single();
  const { data, error } = await query;
  if (error || !data) {
    throw new Error(`Failed to update item: ${error?.message}`);
  }
  return data as StoreItem;
}

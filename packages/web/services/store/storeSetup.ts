import { createSlug } from "./shared";
import type { Store } from "~~/lib/store.types";
import { supabase } from "~~/lib/supabase";

async function slugTaken(slug: string) {
  const { data } = await supabase.from("stores").select("id").eq("store_slug", slug).maybeSingle();
  return Boolean(data);
}

/** A globally unique slug from the store name: `coffee`, then `coffee-2`, `coffee-3`, ... */
async function uniqueStoreSlug(name: string) {
  const base = createSlug(name) || "store";
  if (!(await slugTaken(base))) return base;
  for (let n = 2; n < 20; n++) {
    if (!(await slugTaken(`${base}-${n}`))) return `${base}-${n}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Creates a store owned by `ownerWallet`; checkout pays that wallet directly. */
export async function createStore(input: {
  ownerWallet: string;
  storeName: string;
  storeDescription?: string | null;
}): Promise<Store> {
  const row = {
    owner_wallet: input.ownerWallet.toLowerCase(),
    store_name: input.storeName.trim(),
    store_description: input.storeDescription?.trim() || null,
    status: "active",
  };

  let slug = await uniqueStoreSlug(input.storeName);
  let result = await supabase
    .from("stores")
    .insert({ ...row, store_slug: slug })
    .select("*")
    .single();
  if (result.error?.code === "23505") {
    // Another store took the slug between the check and the insert.
    slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;
    result = await supabase
      .from("stores")
      .insert({ ...row, store_slug: slug })
      .select("*")
      .single();
  }

  if (result.error || !result.data) {
    throw new Error(`Failed to create store: ${result.error?.message}`);
  }
  return result.data as Store;
}

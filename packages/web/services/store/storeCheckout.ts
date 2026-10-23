import { STORE_TOKEN, fromMicros, getStoreById, toMicros } from "./shared";
import type { CartLineInput, CheckoutQuote } from "~~/lib/store.types";
import type { StoreItem, StoreOrder, StoreOrderItem } from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

/** Prices the cart server-side. The buyer pays the whole subtotal to the store owner's wallet in one payment. */
export async function buildCheckoutQuote(storeId: number, cart: CartLineInput[]): Promise<CheckoutQuote> {
  if (cart.length === 0) {
    throw new Error("Cart is empty");
  }

  // Merge repeated lines for the same item so stock is checked against the total quantity.
  const quantities = new Map<number, number>();
  for (const line of cart) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error("Quantities must be whole numbers above zero");
    }
    quantities.set(line.itemId, (quantities.get(line.itemId) ?? 0) + line.quantity);
  }
  cart = [...quantities].map(([itemId, quantity]) => ({ itemId, quantity }));

  const store = await getStoreById(storeId);
  if (!store) {
    throw new Error("Store not found");
  }
  if (store.status !== "active") {
    throw new Error("This store is not taking orders right now");
  }

  const { data: items, error: itemsError } = await supabase
    .from("store_items")
    .select("*")
    .in(
      "id",
      cart.map(line => line.itemId),
    )
    .eq("store_id", storeId);

  if (itemsError) {
    throw new Error(`Failed to fetch cart items: ${itemsError.message}`);
  }

  const itemMap = new Map<number, StoreItem>(((items || []) as StoreItem[]).map(item => [item.id, item]));
  let subtotalMicros = 0;

  const normalizedCart = cart.map(line => {
    const item = itemMap.get(line.itemId);
    if (!item) {
      throw new Error(`Item ${line.itemId} is not available in this store`);
    }
    if (item.status !== "active") {
      throw new Error(`${item.name} is not available for checkout`);
    }
    const stock = Number(item.stock ?? 0);
    if (stock < line.quantity) {
      throw new Error(stock > 0 ? `${item.name} only has ${stock} left` : `${item.name} is sold out`);
    }

    const unitPriceMicros = toMicros(item.price);
    const lineTotalMicros = unitPriceMicros * line.quantity;
    subtotalMicros += lineTotalMicros;

    return {
      itemId: item.id,
      name: item.name,
      quantity: line.quantity,
      unitPrice: fromMicros(unitPriceMicros),
      unitPriceMicros: unitPriceMicros.toString(),
      lineTotal: fromMicros(lineTotalMicros),
      lineTotalMicros: lineTotalMicros.toString(),
      stock,
    };
  });

  if (subtotalMicros <= 0) {
    throw new Error("The cart total must be above zero");
  }

  return {
    storeId,
    tokenAddress: STORE_TOKEN,
    subtotal: fromMicros(subtotalMicros),
    subtotalMicros: subtotalMicros.toString(),
    payoutRecipient: store.owner_wallet.toLowerCase() as `0x${string}`,
    payoutAmountMicros: subtotalMicros.toString(),
    cart: normalizedCart,
  };
}

export async function createStoreOrderRecord(params: {
  storeId: number;
  buyerWallet: string;
  quote: CheckoutQuote;
  txHash: string;
}): Promise<{ order: StoreOrder; orderItems: StoreOrderItem[] }> {
  const { data: order, error } = await supabase
    .from("store_orders")
    .insert({
      store_id: params.storeId,
      buyer_wallet: params.buyerWallet.toLowerCase(),
      subtotal: parseFloat(params.quote.subtotal),
      token_address: params.quote.tokenAddress.toLowerCase(),
      tx_hash: params.txHash,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !order) {
    throw new Error(`Failed to create store order: ${error?.message}`);
  }

  const { data: orderItems, error: itemError } = await supabase
    .from("store_order_items")
    .insert(
      params.quote.cart.map(line => ({
        order_id: order.id,
        item_id: line.itemId,
        quantity: line.quantity,
        unit_price: parseFloat(line.unitPrice),
      })),
    )
    .select("*");

  if (itemError || !orderItems) {
    await supabase.from("store_orders").delete().eq("id", order.id);
    throw new Error(`Failed to create order items: ${itemError?.message}`);
  }

  return {
    order: order as StoreOrder,
    orderItems: orderItems as StoreOrderItem[],
  };
}

export async function decrementStockForQuote(quote: CheckoutQuote): Promise<void> {
  const shortfalls: string[] = [];
  for (const line of quote.cart) {
    // Compare-and-set on the current stock (retried on conflict) so concurrent checkouts both count.
    let decremented = false;
    for (let attempt = 0; attempt < 5 && !decremented; attempt++) {
      const { data: item } = await supabase.from("store_items").select("stock").eq("id", line.itemId).maybeSingle();
      const stock = Number(item?.stock ?? 0);
      const nextStock = Math.max(0, stock - line.quantity);
      const { data: updated, error } = await supabase
        .from("store_items")
        .update({ stock: nextStock })
        .eq("id", line.itemId)
        .eq("stock", stock)
        .select("id");
      if (error) {
        throw new Error(`Failed to update stock for item ${line.itemId}: ${error.message}`);
      }
      if (!updated?.length) continue;

      decremented = true;
      if (stock < line.quantity) shortfalls.push(`${line.name} oversold by ${line.quantity - stock}`);
    }
    if (!decremented) shortfalls.push(`${line.name} stock could not be updated`);
  }

  if (shortfalls.length) {
    throw new Error(`Stock needs attention: ${shortfalls.join("; ")}`);
  }
}

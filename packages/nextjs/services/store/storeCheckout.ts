import { DEFAULT_STORE_TOKEN, fromMicros, getStoreRecordById, toMicros } from "./shared";
import type { CartLineInput, CheckoutQuote } from "~~/lib/store.types";
import type { StoreOrder, StoreOrderItem } from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

export async function buildCheckoutQuote(stallId: number, cart: CartLineInput[]): Promise<CheckoutQuote> {
  if (cart.length === 0) {
    throw new Error("Cart is empty");
  }

  const storeRecord = await getStoreRecordById(stallId);
  if (!storeRecord.operator_wallet) {
    throw new Error("Store manager wallet is not configured");
  }
  if (!storeRecord.event?.owner_wallet) {
    throw new Error("Store admin wallet is not configured");
  }

  const itemIds = cart.map(line => line.itemId);
  const { data: items, error: itemsError } = await supabase
    .from("store_items")
    .select(
      `
      *,
      inventory:store_inventory(*)
    `,
    )
    .in("id", itemIds)
    .eq("stall_id", stallId);

  if (itemsError) {
    throw new Error(`Failed to fetch cart items: ${itemsError.message}`);
  }

  const itemMap = new Map<number, any>((items || []).map(item => [item.id, item]));
  let subtotalMicros = 0;

  const normalizedCart = cart.map(line => {
    const item = itemMap.get(line.itemId);
    if (!item) {
      throw new Error(`Item ${line.itemId} is not available in this store`);
    }
    if (item.status !== "active") {
      throw new Error(`${item.name} is not available for checkout`);
    }
    const inventory = Array.isArray(item.inventory) ? item.inventory[0] : item.inventory;
    const currentStock = inventory?.current_stock ?? 0;
    if (line.quantity <= 0) {
      throw new Error(`Invalid quantity for ${item.name}`);
    }
    if (currentStock < line.quantity) {
      throw new Error(`${item.name} only has ${currentStock} left`);
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
      currentStock,
      tokenAddress: item.token_address,
    };
  });

  const managerSharePct = Number(storeRecord.split_percentage);
  const managerMicros = Math.floor((subtotalMicros * managerSharePct) / 100);
  const adminMicros = subtotalMicros - managerMicros;

  return {
    storeId: stallId,
    eventId: storeRecord.event_id,
    tokenAddress: normalizedCart[0]?.tokenAddress || storeRecord.token_address || DEFAULT_STORE_TOKEN,
    subtotal: fromMicros(subtotalMicros),
    subtotalMicros: subtotalMicros.toString(),
    managerAmount: fromMicros(managerMicros),
    managerAmountMicros: managerMicros.toString(),
    adminAmount: fromMicros(adminMicros),
    adminAmountMicros: adminMicros.toString(),
    managerRecipient: storeRecord.operator_wallet.toLowerCase(),
    adminRecipient: storeRecord.event.owner_wallet.toLowerCase(),
    cart: normalizedCart,
  };
}

export async function createStoreOrderRecord(params: {
  stallId: number;
  buyerWallet: string;
  quote: CheckoutQuote;
  status?: StoreOrder["status"];
  txHash?: string | null;
}): Promise<{ order: StoreOrder; orderItems: StoreOrderItem[] }> {
  const { data: order, error } = await supabase
    .from("store_orders")
    .insert({
      stall_id: params.stallId,
      buyer_wallet: params.buyerWallet.toLowerCase(),
      subtotal: parseFloat(params.quote.subtotal),
      manager_amount: parseFloat(params.quote.managerAmount),
      admin_amount: parseFloat(params.quote.adminAmount),
      token_address: params.quote.tokenAddress.toLowerCase(),
      tx_hash: params.txHash || null,
      status: params.status || "pending",
      completed_at: params.status === "completed" ? new Date().toISOString() : null,
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

export async function completeStoreOrder(orderId: number, txHash: string): Promise<StoreOrder> {
  const { data, error } = await supabase
    .from("store_orders")
    .update({
      status: "completed",
      tx_hash: txHash,
      completed_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to complete order: ${error?.message}`);
  }

  return data as StoreOrder;
}

export async function failStoreOrder(orderId: number): Promise<void> {
  await supabase.from("store_orders").update({ status: "failed" }).eq("id", orderId);
}

export async function decrementInventoryForQuote(quote: CheckoutQuote): Promise<void> {
  for (const line of quote.cart) {
    const nextStock = line.currentStock - line.quantity;
    const { error } = await supabase
      .from("store_inventory")
      .update({ current_stock: nextStock })
      .eq("item_id", line.itemId)
      .gte("current_stock", line.quantity);

    if (error) {
      throw new Error(`Failed to update inventory for item ${line.itemId}: ${error.message}`);
    }

    if (nextStock <= 0) {
      await supabase.from("store_items").update({ status: "out_of_stock" }).eq("id", line.itemId);
    }
  }
}

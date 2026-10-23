import { getPublicStores, getStoreItems, getStoresOwnedBy } from "./storeQueries";
import { LOW_STOCK_THRESHOLD, type StoreAnalytics, type StoreDashboardData } from "~~/lib/store.types";
import type { StoreOrder, StoreOrderItem } from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

const RECENT_ORDERS = 8;

export async function getStoreAnalytics(storeId: number): Promise<StoreAnalytics> {
  const [ordersResult, orderItemsResult, items] = await Promise.all([
    supabase
      .from("store_orders")
      .select("*, buyer:users!buyer_wallet(name)")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
    supabase
      .from("store_order_items")
      .select("*, order:store_orders!inner(store_id, status)")
      .eq("order.store_id", storeId)
      .eq("order.status", "completed"),
    getStoreItems(storeId),
  ]);
  if (ordersResult.error) throw new Error(`Failed to fetch store orders: ${ordersResult.error.message}`);
  if (orderItemsResult.error) throw new Error(`Failed to fetch order items: ${orderItemsResult.error.message}`);

  const orders = (ordersResult.data || []) as (StoreOrder & { buyer?: { name: string } | null })[];
  const orderItems = (orderItemsResult.data || []) as StoreOrderItem[];

  const itemNames = new Map(items.map(item => [item.id, item.name]));
  const topItemMap = new Map<number, StoreAnalytics["topItems"][number]>();
  const itemCountByOrder = new Map<number, number>();
  for (const line of orderItems) {
    itemCountByOrder.set(line.order_id, (itemCountByOrder.get(line.order_id) ?? 0) + Number(line.quantity));
    const entry = topItemMap.get(line.item_id) || {
      itemId: line.item_id,
      name: itemNames.get(line.item_id) ?? `Item ${line.item_id}`,
      quantitySold: 0,
      revenue: 0,
    };
    entry.quantitySold += Number(line.quantity);
    entry.revenue += Number(line.quantity) * Number(line.unit_price);
    topItemMap.set(line.item_id, entry);
  }

  return {
    storeId,
    totalRevenue: orders.reduce((sum, order) => sum + Number(order.subtotal), 0),
    totalOrders: orders.length,
    activeItems: items.filter(item => item.status === "active").length,
    lowStockItems: items.filter(item => item.status === "active" && item.stock <= LOW_STOCK_THRESHOLD).length,
    topItems: Array.from(topItemMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5),
    recentOrders: orders.slice(0, RECENT_ORDERS).map(order => ({
      id: order.id,
      buyer_wallet: order.buyer_wallet,
      buyer_name: order.buyer?.name ?? null,
      subtotal: Number(order.subtotal),
      tx_hash: order.tx_hash,
      created_at: order.created_at,
      itemCount: itemCountByOrder.get(order.id) ?? 0,
    })),
  };
}

/** The public store list, plus the stores `wallet` owns when a wallet is given. */
export async function getStoreDashboardData(wallet?: string | null): Promise<StoreDashboardData> {
  const [publicStores, myStores] = await Promise.all([
    getPublicStores(24),
    wallet ? getStoresOwnedBy(wallet) : Promise.resolve([]),
  ]);
  return { myStores, publicStores };
}

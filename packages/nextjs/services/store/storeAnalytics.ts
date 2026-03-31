import { getManagerAgentByStore, getPublicStores, getStoreItems } from "./storeQueries";
import type { Event } from "~~/lib/events.types";
import type { StoreAnalytics, StoreDashboardData, StoreWithCatalog } from "~~/lib/store.types";
import type { AgentRun, AgentValidation, ManagerAgent, StoreOrder, StoreOrderItem } from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

export async function getStoreAnalytics(stallId: number): Promise<StoreAnalytics> {
  const [ordersResult, itemsResult, orderItemsResult] = await Promise.all([
    supabase.from("store_orders").select("*").eq("stall_id", stallId),
    supabase
      .from("store_items")
      .select(
        `
        *,
        inventory:store_inventory(*)
      `,
      )
      .eq("stall_id", stallId),
    supabase
      .from("store_order_items")
      .select(
        `
        *,
        order:store_orders!order_id(stall_id, status)
      `,
      )
      .order("created_at", { ascending: false }),
  ]);

  if (ordersResult.error) throw new Error(`Failed to fetch store orders: ${ordersResult.error.message}`);
  if (itemsResult.error) throw new Error(`Failed to fetch store items: ${itemsResult.error.message}`);
  if (orderItemsResult.error) throw new Error(`Failed to fetch order items: ${orderItemsResult.error.message}`);

  const orders = (ordersResult.data || []) as StoreOrder[];
  const items = (itemsResult.data || []) as any[];
  const orderItems = ((orderItemsResult.data || []) as any[]).filter(
    orderItem => orderItem.order?.stall_id === stallId,
  );

  const completedOrders = orders.filter(order => order.status === "completed");
  const failedOrders = orders.filter(order => order.status === "failed");
  const totalRevenue = completedOrders.reduce((sum, order) => sum + Number(order.subtotal), 0);
  const managerRevenue = completedOrders.reduce((sum, order) => sum + Number(order.manager_amount), 0);
  const adminRevenue = completedOrders.reduce((sum, order) => sum + Number(order.admin_amount), 0);
  const lowStockItems = items.filter(item => {
    const inventory = Array.isArray(item.inventory) ? item.inventory[0] : item.inventory;
    return inventory && inventory.current_stock <= inventory.reorder_threshold;
  }).length;

  const topItemMap = new Map<number, { itemId: number; name: string; quantitySold: number; revenue: number }>();
  for (const orderItem of orderItems) {
    if (orderItem.order?.status !== "completed") continue;
    const item = items.find(candidate => candidate.id === orderItem.item_id);
    if (!item) continue;
    const entry = topItemMap.get(orderItem.item_id) || {
      itemId: orderItem.item_id,
      name: item.name,
      quantitySold: 0,
      revenue: 0,
    };
    entry.quantitySold += Number(orderItem.quantity);
    entry.revenue += Number(orderItem.quantity) * Number(orderItem.unit_price);
    topItemMap.set(orderItem.item_id, entry);
  }

  return {
    storeId: stallId,
    totalRevenue,
    totalOrders: completedOrders.length,
    managerRevenue,
    adminRevenue,
    lowStockItems,
    activeItems: items.filter(item => item.status === "active").length,
    failedOrders: failedOrders.length,
    topItems: Array.from(topItemMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5),
  };
}

export async function getStoreDashboardData(wallet: string): Promise<StoreDashboardData> {
  const normalizedWallet = wallet.toLowerCase();

  const [ownedNetworksResult, managedStoresResult, publicStores, ordersResult] = await Promise.all([
    supabase.from("events").select("*").eq("owner_wallet", normalizedWallet).order("created_at", { ascending: false }),
    supabase
      .from("stalls")
      .select(
        `
        *,
        event:events!event_id(*),
        operator_user:users!operator_wallet(*)
      `,
      )
      .eq("operator_wallet", normalizedWallet)
      .order("created_at", { ascending: false }),
    getPublicStores(12),
    supabase
      .from("store_orders")
      .select("*")
      .eq("buyer_wallet", normalizedWallet)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (ownedNetworksResult.error) {
    throw new Error(`Failed to fetch owned networks: ${ownedNetworksResult.error.message}`);
  }
  if (managedStoresResult.error) {
    throw new Error(`Failed to fetch managed stores: ${managedStoresResult.error.message}`);
  }
  if (ordersResult.error) {
    throw new Error(`Failed to fetch orders: ${ordersResult.error.message}`);
  }

  const managedStoresRaw = (managedStoresResult.data || []) as any[];
  const managedStores = await Promise.all(
    managedStoresRaw.map(async store => ({
      ...store,
      network: store.event,
      manager_user: store.operator_user,
      items: await getStoreItems(store.id),
      manager_agent: await getManagerAgentByStore(store.id),
    })),
  );

  const recentOrders = (ordersResult.data || []) as StoreOrder[];
  const orderIds = recentOrders.map(order => order.id);
  const orderItems = orderIds.length
    ? (((await supabase.from("store_order_items").select("*").in("order_id", orderIds)).data || []) as StoreOrderItem[])
    : [];

  const storeIds = managedStores.map(store => store.id);
  const agents = storeIds.length
    ? (((await supabase.from("manager_agents").select("*").in("stall_id", storeIds)).data || []) as ManagerAgent[])
    : [];
  const agentIds = agents.map(agent => agent.id);
  const agentRuns = agentIds.length
    ? (((
        await supabase
          .from("agent_runs")
          .select("*")
          .in("agent_id", agentIds)
          .order("started_at", { ascending: false })
          .limit(20)
      ).data || []) as AgentRun[])
    : [];

  const runIds = agentRuns.map(run => run.id);
  const validations = runIds.length
    ? (((await supabase.from("agent_validations").select("*").in("agent_run_id", runIds)).data ||
        []) as AgentValidation[])
    : [];

  return {
    ownedNetworks: (ownedNetworksResult.data || []) as Event[],
    managedStores: managedStores as StoreWithCatalog[],
    publicStores,
    recentOrders,
    recentOrderItems: orderItems,
    agentRuns,
    validations,
  };
}

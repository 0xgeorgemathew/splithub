import { ensureUserExists } from "./userService";
import { isAddress } from "viem";
import { TOKENS, TOKEN_DECIMALS } from "~~/config/tokens";
import type { Event, Stall } from "~~/lib/events.types";
import type {
  CartLineInput,
  CheckoutQuote,
  CreateStoreInput,
  CreateStoreItemInput,
  StoreAnalytics,
  StoreDashboardData,
  StoreWithCatalog,
  UpdateStoreItemInput,
} from "~~/lib/store.types";
import type {
  AgentRun,
  AgentValidation,
  ManagerAgent,
  StoreInventory,
  StoreItem,
  StoreOrder,
  StoreOrderItem,
  User,
} from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

const MICRO_MULTIPLIER = 10 ** TOKEN_DECIMALS.USDC;
const DEFAULT_NETWORK_NAME = "SplitHub Retail Network";

const toMicros = (value: number | string): number => {
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Math.round(parsed * MICRO_MULTIPLIER);
};

const fromMicros = (value: number): string => {
  return (value / MICRO_MULTIPLIER).toFixed(TOKEN_DECIMALS.USDC);
};

const createSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

const normalizeAddress = (value: string) => value.toLowerCase();

async function findOrCreateNetwork(adminWallet: string, networkName?: string, networkSlug?: string): Promise<Event> {
  const ownerWallet = normalizeAddress(adminWallet);
  await ensureUserExists(ownerWallet);

  const slug = createSlug(networkSlug || networkName || DEFAULT_NETWORK_NAME);
  const name = networkName?.trim() || DEFAULT_NETWORK_NAME;

  const { data: existing } = await supabase
    .from("events")
    .select("*")
    .eq("owner_wallet", ownerWallet)
    .eq("event_slug", slug)
    .single();

  if (existing) {
    return existing as Event;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      owner_wallet: ownerWallet,
      event_name: name,
      event_slug: slug,
      event_description: `${name} retail network`,
      status: "active",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create network: ${error?.message}`);
  }

  return data as Event;
}

async function resolveManager(input: CreateStoreInput): Promise<User | null> {
  if (input.managerWallet && isAddress(input.managerWallet)) {
    return await ensureUserExists(input.managerWallet);
  }

  if (input.managerTwitterHandle) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("twitter_handle", input.managerTwitterHandle.replace(/^@/, ""))
      .single();

    return (data as User) || null;
  }

  return null;
}

export async function createStore(
  input: CreateStoreInput,
): Promise<{ network: Event; store: Stall; agent: ManagerAgent }> {
  const network = await findOrCreateNetwork(input.adminWallet, input.networkName, input.networkSlug);
  const manager = await resolveManager(input);

  const { data: store, error } = await supabase
    .from("stalls")
    .insert({
      event_id: network.id,
      stall_name: input.storeName.trim(),
      stall_slug: createSlug(input.storeSlug || input.storeName),
      stall_description: input.storeDescription || null,
      operator_twitter_handle: manager?.twitter_handle || input.managerTwitterHandle?.replace(/^@/, "") || "unassigned",
      operator_wallet: manager?.wallet_address || input.managerWallet?.toLowerCase() || null,
      split_percentage: input.splitPercentage ?? 80,
      status: "active",
      token_address: input.tokenAddress.toLowerCase(),
    })
    .select("*")
    .single();

  if (error || !store) {
    throw new Error(`Failed to create store: ${error?.message}`);
  }

  const agent = await createManagerAgent({
    stallId: store.id,
    operatorWallet: manager?.wallet_address || input.managerWallet?.toLowerCase() || input.adminWallet.toLowerCase(),
    agentName: input.agentName || `${input.storeName} AI Manager`,
  });

  return { network, store: store as Stall, agent };
}

export async function createManagerAgent({
  stallId,
  operatorWallet,
  agentName,
}: {
  stallId: number;
  operatorWallet: string;
  agentName: string;
}): Promise<ManagerAgent> {
  const normalizedWallet = normalizeAddress(operatorWallet);
  await ensureUserExists(normalizedWallet);

  const { data: existing } = await supabase.from("manager_agents").select("*").eq("stall_id", stallId).single();
  if (existing) {
    return existing as ManagerAgent;
  }

  const { data, error } = await supabase
    .from("manager_agents")
    .insert({
      stall_id: stallId,
      agent_name: agentName,
      operator_wallet: normalizedWallet,
      erc8004_agent_id: null,
      agent_address: null,
      status: "active",
      budget_daily_calls: 24,
      budget_daily_tokens: 15000,
      max_restock_value: 250,
      max_price_change_pct: 10,
      min_confidence: 0.72,
      allowed_supplier_urls: [],
      allowed_skus: [],
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create manager agent: ${error?.message}`);
  }

  return data as ManagerAgent;
}

export async function createManagerAgentForStore(stallId: number): Promise<ManagerAgent> {
  const { data: store, error } = await supabase
    .from("stalls")
    .select(
      `
      *,
      event:events!event_id(*)
    `,
    )
    .eq("id", stallId)
    .single();

  if (error || !store) {
    throw new Error(`Store not found: ${error?.message}`);
  }

  const storeRecord = store as any;
  const operatorWallet = storeRecord.operator_wallet || storeRecord.event?.owner_wallet;

  if (!operatorWallet) {
    throw new Error("Store does not have an operator or admin wallet to link to an agent");
  }

  return createManagerAgent({
    stallId,
    operatorWallet,
    agentName: `${storeRecord.stall_name} AI Manager`,
  });
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

export async function getStoreItems(stallId: number): Promise<(StoreItem & { inventory?: StoreInventory | null })[]> {
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

export async function createStoreItem(
  input: CreateStoreItemInput,
): Promise<StoreItem & { inventory: StoreInventory | null }> {
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
): Promise<StoreItem & { inventory: StoreInventory | null }> {
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

export async function getManagerAgentByStore(stallId: number): Promise<ManagerAgent | null> {
  const { data, error } = await supabase.from("manager_agents").select("*").eq("stall_id", stallId).single();
  if (error || !data) {
    return null;
  }
  return data as ManagerAgent;
}

export async function pauseManagerAgent(
  stallId: number,
  status: ManagerAgent["status"] = "paused",
): Promise<ManagerAgent> {
  const { data, error } = await supabase
    .from("manager_agents")
    .update({ status })
    .eq("stall_id", stallId)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Failed to update manager agent: ${error?.message}`);
  }
  return data as ManagerAgent;
}

export async function buildCheckoutQuote(stallId: number, cart: CartLineInput[]): Promise<CheckoutQuote> {
  if (cart.length === 0) {
    throw new Error("Cart is empty");
  }

  const { data: store, error } = await supabase
    .from("stalls")
    .select(
      `
      *,
      event:events!event_id(*)
    `,
    )
    .eq("id", stallId)
    .single();

  if (error || !store) {
    throw new Error(`Store not found: ${error?.message}`);
  }

  const storeRecord = store as any;
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
    tokenAddress: normalizedCart[0]?.tokenAddress || storeRecord.token_address || TOKENS.USDC,
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

  if (ownedNetworksResult.error)
    throw new Error(`Failed to fetch owned networks: ${ownedNetworksResult.error.message}`);
  if (managedStoresResult.error)
    throw new Error(`Failed to fetch managed stores: ${managedStoresResult.error.message}`);
  if (ordersResult.error) throw new Error(`Failed to fetch orders: ${ordersResult.error.message}`);

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

export async function createAgentRun(params: {
  agentId: string;
  runType: string;
  triggerSource: string;
  state?: AgentRun["state"];
  decisionSummary?: string | null;
  toolCalls?: Record<string, any>[];
  retries?: number;
  failures?: Record<string, any>[];
  output?: Record<string, any>;
  computeCostEstimate?: number;
}): Promise<AgentRun> {
  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      agent_id: params.agentId,
      run_type: params.runType,
      trigger_source: params.triggerSource,
      state: params.state || "discovering",
      decision_summary: params.decisionSummary || null,
      tool_calls_json: params.toolCalls || [],
      retries: params.retries || 0,
      failures_json: params.failures || [],
      output_json: params.output || {},
      compute_cost_estimate: params.computeCostEstimate || 0,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create agent run: ${error?.message}`);
  }

  return data as AgentRun;
}

export async function updateAgentRun(
  runId: string,
  updates: Partial<{
    state: AgentRun["state"];
    decisionSummary: string | null;
    toolCalls: Record<string, any>[];
    retries: number;
    failures: Record<string, any>[];
    output: Record<string, any>;
    computeCostEstimate: number;
    completedAt: string | null;
  }>,
): Promise<AgentRun> {
  const payload: Record<string, any> = {};
  if (updates.state !== undefined) payload.state = updates.state;
  if (updates.decisionSummary !== undefined) payload.decision_summary = updates.decisionSummary;
  if (updates.toolCalls !== undefined) payload.tool_calls_json = updates.toolCalls;
  if (updates.retries !== undefined) payload.retries = updates.retries;
  if (updates.failures !== undefined) payload.failures_json = updates.failures;
  if (updates.output !== undefined) payload.output_json = updates.output;
  if (updates.computeCostEstimate !== undefined) payload.compute_cost_estimate = updates.computeCostEstimate;
  if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;

  const { data, error } = await supabase.from("agent_runs").update(payload).eq("id", runId).select("*").single();
  if (error || !data) {
    throw new Error(`Failed to update agent run: ${error?.message}`);
  }
  return data as AgentRun;
}

export async function createAgentValidation(params: {
  agentRunId: string;
  validationTx?: string | null;
  status?: AgentValidation["status"];
  evidenceUri?: string | null;
}): Promise<AgentValidation> {
  const { data, error } = await supabase
    .from("agent_validations")
    .insert({
      agent_run_id: params.agentRunId,
      erc8004_validation_tx: params.validationTx || null,
      status: params.status || "pending",
      evidence_uri: params.evidenceUri || null,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create agent validation: ${error?.message}`);
  }
  return data as AgentValidation;
}

export async function getAgentLogs(agentId: string): Promise<{ runs: AgentRun[]; validations: AgentValidation[] }> {
  const { data: runs, error } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("agent_id", agentId)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch agent runs: ${error.message}`);
  }

  const runIds = (runs || []).map(run => run.id);
  const validations = runIds.length
    ? (((await supabase.from("agent_validations").select("*").in("agent_run_id", runIds)).data ||
        []) as AgentValidation[])
    : [];

  return {
    runs: (runs || []) as AgentRun[],
    validations,
  };
}

export async function executeAutonomousStoreRun(
  stallId: number,
  triggerSource: string,
): Promise<{
  agent: ManagerAgent;
  run: AgentRun;
  actions: Record<string, any>[];
  analytics: StoreAnalytics;
}> {
  const agent = await getManagerAgentByStore(stallId);
  if (!agent) {
    throw new Error("Store agent not configured");
  }
  if (agent.status !== "active") {
    throw new Error("Store agent is paused");
  }

  const analytics = await getStoreAnalytics(stallId);
  const items = await getStoreItems(stallId);
  const lowStockItems = items.filter(item => {
    const inventory = item.inventory;
    return inventory && inventory.current_stock <= inventory.reorder_threshold && item.status !== "archived";
  });

  const actions: Record<string, any>[] = [];
  const failures: Record<string, any>[] = [];

  const run = await createAgentRun({
    agentId: agent.id,
    runType: "autonomous_store_scan",
    triggerSource,
    state: "discovering",
    toolCalls: [
      { tool: "getStoreAnalytics", stallId },
      { tool: "getStoreItems", stallId },
    ],
    decisionSummary: `Discovered ${lowStockItems.length} low-stock items and ${analytics.failedOrders} failed orders.`,
    computeCostEstimate: Math.min(agent.budget_daily_tokens, 1200),
  });

  try {
    await updateAgentRun(run.id, {
      state: "planning",
      toolCalls: [...run.tool_calls_json, { tool: "planActions", lowStockItems: lowStockItems.length }],
    });

    for (const item of lowStockItems) {
      const inventory = item.inventory;
      if (!inventory) continue;
      const unitsToRestock = Math.max(inventory.target_stock - inventory.current_stock, 0);
      if (unitsToRestock === 0) continue;

      const estimatedValue = unitsToRestock * item.price;
      if (estimatedValue > agent.max_restock_value) {
        failures.push({
          type: "budget_guardrail",
          itemId: item.id,
          sku: item.sku,
          estimatedValue,
          maxRestockValue: agent.max_restock_value,
        });
        actions.push({
          type: "skip_restock",
          itemId: item.id,
          reason: "restock_budget_exceeded",
          estimatedValue,
        });
        continue;
      }

      const nextStock = inventory.target_stock;
      await upsertStoreInventory(item.id, {
        currentStock: nextStock,
        reorderThreshold: inventory.reorder_threshold,
        targetStock: inventory.target_stock,
        lastRestockedAt: new Date().toISOString(),
      });

      actions.push({
        type: "restock_item",
        itemId: item.id,
        sku: item.sku,
        previousStock: inventory.current_stock,
        newStock: nextStock,
        estimatedValue,
      });
    }

    const finalState: AgentRun["state"] = failures.length > 0 && actions.length === 0 ? "failed" : "submitted";
    const updatedRun = await updateAgentRun(run.id, {
      state: finalState,
      decisionSummary:
        actions.length > 0
          ? `Executed ${actions.length} autonomous store actions.`
          : "No safe autonomous actions were available within current guardrails.",
      toolCalls: [...run.tool_calls_json, { tool: "restockItems", count: actions.length }],
      failures,
      output: {
        analytics,
        actions,
      },
      completedAt: new Date().toISOString(),
    });

    await createAgentValidation({
      agentRunId: updatedRun.id,
      status: "pending",
      evidenceUri: `/api/agents/${agent.id}/logs`,
    });

    return {
      agent,
      run: updatedRun,
      actions,
      analytics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autonomous run failed";
    const failedRun = await updateAgentRun(run.id, {
      state: "failed",
      failures: [...failures, { type: "runtime_error", message }],
      output: {
        analytics,
        actions,
      },
      completedAt: new Date().toISOString(),
    });
    throw new Error(`Agent run failed: ${failedRun.id}: ${message}`);
  }
}

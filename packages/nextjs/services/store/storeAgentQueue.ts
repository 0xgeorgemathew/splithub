import { getStoreAnalytics } from "./storeAnalytics";
import { getStoreItems } from "./storeQueries";
import { env } from "cloudflare:workers";
import "server-only";
import { supabase } from "~~/lib/supabase";

export type StoreAgentRunPayload = {
  storeId: number;
  triggerSource?: string;
};

/** Queues a durable store agent run (worker/store-agent-workflow.ts). */
export async function queueStoreAgentRun(payload: StoreAgentRunPayload) {
  const instance = await env.STORE_AGENT_RUN.create({ params: payload });
  return { id: instance.id };
}

/**
 * Scheduled health scan (Cron Trigger). Queues an agent run for every active store that has
 * low-stock items or failed orders; healthy stores are skipped so no model calls are spent on them.
 */
export async function runStoreHealthScan() {
  const { data: activeAgents, error } = await supabase
    .from("manager_agents")
    .select("id, stall_id, status")
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to fetch active store agents: ${error.message}`);
  }

  const queuedStores: Array<{
    storeId: number;
    runId: string;
    reason: string;
    lowStockItems: number;
    failedOrders: number;
  }> = [];
  const skippedStores: Array<{ storeId: number; lowStockItems: number; failedOrders: number }> = [];

  for (const agent of activeAgents || []) {
    const [analytics, items] = await Promise.all([getStoreAnalytics(agent.stall_id), getStoreItems(agent.stall_id)]);
    const lowStockItems = items.filter(item => {
      const inventory = item.inventory;
      return inventory && inventory.current_stock <= inventory.reorder_threshold && item.status !== "archived";
    }).length;

    if (lowStockItems === 0 && analytics.failedOrders === 0) {
      skippedStores.push({ storeId: agent.stall_id, lowStockItems, failedOrders: analytics.failedOrders });
      continue;
    }

    const { id } = await queueStoreAgentRun({ storeId: agent.stall_id, triggerSource: "scheduled_health_scan" });
    queuedStores.push({
      storeId: agent.stall_id,
      runId: id,
      reason: lowStockItems > 0 ? "low_stock" : "failed_orders",
      lowStockItems,
      failedOrders: analytics.failedOrders,
    });
  }

  return { queuedCount: queuedStores.length, skippedCount: skippedStores.length, queuedStores, skippedStores };
}

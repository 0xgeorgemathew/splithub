import { storeAgentRunTask } from "./store-agent-run";
import { logger, schedules } from "@trigger.dev/sdk";
import { supabase } from "~~/lib/supabase";
import { getStoreAnalytics, getStoreItems } from "~~/services/storeService";

export const storeHealthScanTask = schedules.task({
  id: "store-health-scan",
  cron: "*/15 * * * *",
  // cron: "* * * * *",

  run: async payload => {
    logger.info("Starting scheduled store health scan", {
      timestamp: payload.timestamp.toISOString(),
      scheduleId: payload.scheduleId,
    });

    const { data: activeAgents, error } = await supabase
      .from("manager_agents")
      .select("id, stall_id, status")
      .eq("status", "active");

    if (error) {
      throw new Error(`Failed to fetch active store agents: ${error.message}`);
    }

    const queuedStores: Array<{ storeId: number; reason: string; lowStockItems: number; failedOrders: number }> = [];
    const skippedStores: Array<{ storeId: number; lowStockItems: number; failedOrders: number }> = [];

    for (const agent of activeAgents || []) {
      const [analytics, items] = await Promise.all([getStoreAnalytics(agent.stall_id), getStoreItems(agent.stall_id)]);
      const lowStockItems = items.filter(item => {
        const inventory = item.inventory;
        return inventory && inventory.current_stock <= inventory.reorder_threshold && item.status !== "archived";
      }).length;

      if (lowStockItems === 0 && analytics.failedOrders === 0) {
        skippedStores.push({
          storeId: agent.stall_id,
          lowStockItems,
          failedOrders: analytics.failedOrders,
        });
        continue;
      }

      await storeAgentRunTask.trigger({
        storeId: agent.stall_id,
        triggerSource: "scheduled_health_scan",
      });

      queuedStores.push({
        storeId: agent.stall_id,
        reason: lowStockItems > 0 ? "low_stock" : "failed_orders",
        lowStockItems,
        failedOrders: analytics.failedOrders,
      });
    }

    logger.info("Completed scheduled store health scan", {
      queuedCount: queuedStores.length,
      skippedCount: skippedStores.length,
      queuedStores,
    });

    return {
      queuedCount: queuedStores.length,
      skippedCount: skippedStores.length,
      queuedStores,
      skippedStores,
    };
  },
});

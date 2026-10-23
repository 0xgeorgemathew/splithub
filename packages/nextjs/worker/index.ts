/**
 * Cloudflare Worker entry for SplitHub.
 *
 * - fetch: realtime WebSocket upgrades go to the RealtimeHub Durable Object; everything else is vinext.
 * - scheduled: Cron Trigger running the store health scan (was a Trigger.dev schedule).
 * - exports: Durable Object and Workflow classes bound in wrangler.jsonc.
 */
import type { ExportedHandler } from "@cloudflare/workers-types";
import handler from "vinext/server/fetch-handler";
import { runStoreHealthScan } from "~~/services/store/storeAgentQueue";

export { RealtimeHub } from "./realtime-hub";
export { StoreAgentRunWorkflow } from "./store-agent-workflow";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/realtime") {
      return env.REALTIME.getByName("global").fetch(request);
    }
    return handler.fetch(request as unknown as Request, env, ctx) as Promise<any>;
  },

  async scheduled(controller, _env, ctx) {
    ctx.waitUntil(
      runStoreHealthScan().then(
        result => console.log("Store health scan complete", { cron: controller.cron, ...result }),
        error => console.error("Store health scan failed", error),
      ),
    );
  },
} satisfies ExportedHandler<Env>;

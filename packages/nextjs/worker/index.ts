/**
 * Cloudflare Worker entry for SplitHub.
 *
 * - fetch: realtime WebSocket upgrades go to the RealtimeHub Durable Object; everything else is vinext.
 * - exports: Durable Object classes bound in cloudflare.config.ts.
 */
import type { ExportedHandler } from "@cloudflare/workers-types";
import handler from "vinext/server/fetch-handler";

export { RealtimeHub } from "./realtime-hub";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/realtime") {
      return env.REALTIME.getByName("global").fetch(request);
    }
    return handler.fetch(request as unknown as Request, env, ctx) as Promise<any>;
  },
} satisfies ExportedHandler<Env>;

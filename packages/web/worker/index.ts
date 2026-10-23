/**
 * Cloudflare Worker entry for SplitHub.
 *
 * - fetch: realtime WebSocket upgrades go to the RealtimeHub Durable Object; everything else is TanStack Start.
 * - exports: Durable Object classes bound in cloudflare.config.ts.
 */
import handler from "@tanstack/react-start/server-entry";
import type { ExportedHandler } from "@cloudflare/workers-types";

export { RealtimeHub } from "./realtime-hub";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/realtime") {
      return env.REALTIME.getByName("global").fetch(request);
    }
    return handler.fetch(request as unknown as Request) as Promise<any>;
  },
} satisfies ExportedHandler<Env>;

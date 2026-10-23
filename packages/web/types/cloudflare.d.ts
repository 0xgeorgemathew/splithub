/**
 * Cloudflare Worker types for the app.
 *
 * The app type-checks against DOM types (it is mostly React client code), so the Workers runtime
 * types are pulled in through the importable `@cloudflare/workers-types` entry instead of as globals.
 * Bindings mirror cloudflare.config.ts.
 */
import type {
  WebSocketPair as CfWebSocketPair,
  WebSocketRequestResponsePair as CfWebSocketRequestResponsePair,
  D1Database,
  DurableObjectNamespace,
  Fetcher,
} from "@cloudflare/workers-types";
import type { RealtimeHub } from "~~/worker/realtime-hub";

declare global {
  interface Env {
    ASSETS: Fetcher;
    DB: D1Database;
    REALTIME: DurableObjectNamespace<RealtimeHub>;

    ONESIGNAL_REST_API_KEY: string;
  }

  // Workers runtime globals used by worker/realtime-hub.ts.
  const WebSocketPair: typeof CfWebSocketPair;
  const WebSocketRequestResponsePair: typeof CfWebSocketRequestResponsePair;
}

type AppEnv = Env;

// `env` from "cloudflare:workers" and the DurableObject defaults use Cloudflare.Env.
declare module "@cloudflare/workers-types" {
  namespace Cloudflare {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Env extends AppEnv {}
  }
}

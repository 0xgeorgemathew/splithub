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
  ImagesBinding,
  R2Bucket,
  Workflow,
} from "@cloudflare/workers-types";
import type { StoreAgentRunPayload } from "~~/services/store/storeAgentQueue";
import type { RealtimeHub } from "~~/worker/realtime-hub";

declare global {
  interface Env {
    ASSETS: Fetcher;
    IMAGES: ImagesBinding;
    DB: D1Database;
    EVIDENCE: R2Bucket;
    REALTIME: DurableObjectNamespace<RealtimeHub>;
    STORE_AGENT_RUN: Workflow<StoreAgentRunPayload>;

    NEXT_PUBLIC_APP_URL: string;
    VINCENT_APP_URL: string;
    OPENAI_STORE_AGENT_MODEL: string;
    STORE_SUPPLIER_WEBHOOK_URL: string;
    STORE_SUPPLIER_TIMEOUT_MS: string;
    ERC8004_IDENTITY_REGISTRY_ADDRESS: string;
    ERC8004_REPUTATION_REGISTRY_ADDRESS: string;
    ERC8004_VALIDATION_REGISTRY_ADDRESS: string;

    RELAYER_PRIVATE_KEY: string;
    OPENAI_API_KEY: string;
    ONESIGNAL_REST_API_KEY: string;
    STORE_SUPPLIER_SHARED_SECRET: string;
    ERC8004_TRUST_RPC_URL: string;
  }

  // Workers runtime globals used by worker/realtime-hub.ts.
  const WebSocketPair: typeof CfWebSocketPair;
  const WebSocketRequestResponsePair: typeof CfWebSocketRequestResponsePair;
}

type AppEnv = Env;

// `env` from "cloudflare:workers" and the DurableObject/WorkflowEntrypoint defaults use Cloudflare.Env.
declare module "@cloudflare/workers-types" {
  namespace Cloudflare {
    interface Env extends AppEnv {}
  }
}

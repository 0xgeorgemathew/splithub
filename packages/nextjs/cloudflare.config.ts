import { bindings, defineConfig, defineWorker, exports, triggers } from "cf/config";

const WORKER_NAME = "splithub";

export default defineConfig({
  // "George Mathew" account, which owns the splithub.space zone.
  accountId: "a22fe9411b81705409eb7cdf9be367e3",
  worker: defineWorker({
    name: WORKER_NAME,
    entrypoint: "./worker/index.ts",
    compatibilityDate: "2026-10-23",
    compatibilityFlags: ["nodejs_compat"],
    domains: ["splithub.space"],
    observability: { enabled: true },
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    // Store health scan; queues StoreAgentRunWorkflow instances for stores that need attention.
    triggers: [triggers.scheduled({ schedule: "*/15 * * * *" })],
    exports: {
      RealtimeHub: exports.durableObject({ storage: "sqlite" }),
      StoreAgentRunWorkflow: exports.workflow({ name: "splithub-store-agent-run" }),
    },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      DB: bindings.d1({ name: "splithub", id: "f23e1fee-64b4-4098-b14b-3ee354dc722c" }),
      EVIDENCE: bindings.r2({ name: "splithub-evidence" }),
      REALTIME: bindings.durableObject({ worker: WORKER_NAME, exportName: "RealtimeHub" }),
      STORE_AGENT_RUN: bindings.workflow({
        name: "splithub-store-agent-run",
        worker: WORKER_NAME,
        exportName: "StoreAgentRunWorkflow",
      }),

      // Server-side configuration (read through process.env by existing code).
      NEXT_PUBLIC_APP_URL: bindings.text("https://splithub.space"),
      VINCENT_APP_URL: bindings.text("https://splithub.space"),
      OPENAI_STORE_AGENT_MODEL: bindings.text("gpt-5.4-mini"),
      STORE_SUPPLIER_WEBHOOK_URL: bindings.text("https://splithub.space/api/supplier/restock"),
      STORE_SUPPLIER_TIMEOUT_MS: bindings.text("15000"),
      ERC8004_IDENTITY_REGISTRY_ADDRESS: bindings.text("0x8004A818BFB912233c491871b3d84c89A494BD9e"),
      ERC8004_REPUTATION_REGISTRY_ADDRESS: bindings.text("0x8004B663056A597Dffe9eCcC1965A193B7388713"),
      ERC8004_VALIDATION_REGISTRY_ADDRESS: bindings.text("0x8004Cb1BF31DAf7788923b405b754f57acEB4272"),

      RELAYER_PRIVATE_KEY: bindings.secret(),
      OPENAI_API_KEY: bindings.secret(),
      ONESIGNAL_REST_API_KEY: bindings.secret(),
      STORE_SUPPLIER_SHARED_SECRET: bindings.secret(),
      ERC8004_TRUST_RPC_URL: bindings.secret(),
    },
  }),
});

import { bindings, defineConfig, defineWorker, exports } from "cf/config";

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
    exports: {
      RealtimeHub: exports.durableObject({ storage: "sqlite" }),
    },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      DB: bindings.d1({ name: "splithub", id: "f23e1fee-64b4-4098-b14b-3ee354dc722c" }),
      REALTIME: bindings.durableObject({ worker: WORKER_NAME, exportName: "RealtimeHub" }),

      // Server-side configuration (read through process.env by existing code).
      NEXT_PUBLIC_APP_URL: bindings.text("https://splithub.space"),

      ONESIGNAL_REST_API_KEY: bindings.secret(),
    },
  }),
});

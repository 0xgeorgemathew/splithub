import { cloudflare } from "@cloudflare/vite-plugin";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";
import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    vinext({
      images: { optimizer: imagesOptimizer() },
    }),
    cloudflare({
      // The worker entry runs in the RSC environment, with SSR as a child.
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
  // Worker sourcemaps for the wallet SDK bundles exceed the 60 MiB upload limit.
  environments: {
    rsc: { build: { sourcemap: false } },
    ssr: { build: { sourcemap: false } },
  },
  optimizeDeps: {
    // CommonJS packages reached through ESM wallet SDKs (WalletConnect logger) need pre-bundling in dev.
    include: ["pino", "pino/browser.js"],
  },
  resolve: {
    alias: [{ find: /^~~\//, replacement: `${root}` }],
  },
});

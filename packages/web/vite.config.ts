import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  server: {
    allowedHosts: ["dev.splithub.space", ".dev.splithub.space", "splithub.space", ".splithub.space"],
  },
  plugins: [
    // The Worker entry (worker/index.ts) runs in the SSR environment and hands requests to TanStack Start.
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    viteReact(),
  ],
  // Worker sourcemaps for the wallet SDK bundles exceed the 60 MiB upload limit.
  environments: {
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

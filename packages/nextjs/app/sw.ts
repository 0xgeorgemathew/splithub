/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & SerwistGlobalConfig & { __SW_MANIFEST: (PrecacheEntry | string)[] };

// Note: OneSignal uses its own service worker (OneSignalSDK.sw.js)
// This Serwist worker handles PWA caching only

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // CRITICAL: Never cache relay/transaction endpoints (prevents nonce issues)
    {
      matcher: /\/api\/relay\/.*/,
      handler: new NetworkOnly(),
    },
    // CRITICAL: Never cache authentication endpoints
    {
      matcher: /\/api\/auth\/.*/,
      handler: new NetworkOnly(),
    },
    // Never cache onboarding endpoints
    {
      matcher: /\/api\/onboarding\/.*/,
      handler: new NetworkOnly(),
    },
    // Never cache payment request endpoints (need fresh data)
    {
      matcher: /\/api\/payment-requests\/.*/,
      handler: new NetworkOnly(),
    },
    // Never cache notification endpoints
    {
      matcher: /\/api\/notifications\/.*/,
      handler: new NetworkOnly(),
    },
    // STANDARD: Cache everything else (Next.js assets, public files)
    ...defaultCache,
  ],
});

serwist.addEventListeners();

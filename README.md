# SplitHub

> Tap-to-pay onchain payments for stores, venues, and friends.

SplitHub lets people pay in person by tapping an Arx Halo NFC chip. Merchants run stores with a catalog and
inventory, venues run stalls with operators and revenue splits, and friends split expenses and settle up with
the same tap.

The idea behind it:

**the chip authorizes, your wallet pays.**

The chip signs an EIP-712 payment authorization. The `SplitHubPayments` contract checks that the chip is
registered to the payer and moves USDC straight from the payer's wallet to the recipient. Nothing is stored on
the chip, there is no relayer, and losing the chip does not lose funds.

---

## Features

### Stores

- Anyone signed in can set up a store with a name and an optional description; payments go to their wallet
- Catalog items with a price, optional description and image, a stock count, and pausing items or the whole store
- Tap checkout: the server prices the cart, the buyer's chip authorizes one payment to the store owner, and the
  order is recorded only after the server verifies the payment onchain
- Sales summary per store: revenue, orders, top sellers, recent orders, low stock

Routes: `/store`, `/store/$storeSlug`

### Venues

- Set up venues and events, add stalls, assign operators, and choose each operator's share of revenue
- A stall terminal page per stall (`/events/$eventSlug/$stallSlug`): guests tap their chip and pay the operator
- Live owner and operator dashboards, public stall discovery, and venue credits (`CreditToken`)

Routes: `/events`, `/events/discover`, `/events/$eventSlug/$stallSlug`, `/credits`

### Splits

- Shared expenses with friends and live balances
- Payment requests and reminders
- Circles with auto-splitting
- Settle one friend, or collect several chip signatures and settle a group in one transaction

Routes: `/splits`, `/expense/add`, `/settle`, `/settle/$requestId`, `/multi-settle`, `/request/create`, `/requests`

---

## How a tap payment works

1. The app builds a `PaymentAuth { payer, recipient, token, amount, nonce, deadline }`. On a store or stall
   terminal, a first tap reads the chip and looks up its owner in `SplitHubRegistry`.
2. The chip signs the typed data.
3. The wallet signed in on the device (the shopper's own phone, or the merchant's terminal) submits
   `SplitHubPayments.executePayment`, which pulls the USDC from the payer's wallet. Users approve the contract
   once during onboarding (`/approve`).
4. For store orders and stall payments, the API verifies the `PaymentExecuted` event before recording anything.

Code: `packages/web/lib/tapPayment.ts`, `packages/web/hooks/useTapPayment.ts`.

---

## Architecture

| Layer | Tech |
| --- | --- |
| App | TanStack Start + TanStack Router on Vite, React 19, Tailwind CSS 4, DaisyUI 5 |
| Hosting | Cloudflare Workers (`splithub` on `splithub.space`) via `@cloudflare/vite-plugin` |
| Data | Cloudflare D1 behind a supabase-js compatible query layer (`lib/db`), realtime through a Durable Object |
| Auth | Privy (social login + embedded wallet); API routes verify Privy access tokens (`lib/auth.ts`) |
| Chain | Base Sepolia (`84532`), Viem, Wagmi |
| NFC | `@arx-research/libhalo` |
| Contracts | Foundry, Solidity 0.8.19, OpenZeppelin |

```text
packages/web/
  src/routes/               Pages and API routes (TanStack file routes)
  components/               UI (store/, events/, stall/, splits/, settle/, credits/, ...)
  hooks/                    Client hooks (tap payments, realtime, chip)
  lib/                      tapPayment, auth, db layer, contract ABIs
  services/                 Store, venue, split and settlement logic
  migrations/               D1 schema (mirrored by lib/db/schema.ts)
  worker/                   Worker entry and RealtimeHub Durable Object
packages/foundry/
  contracts/                SplitHubRegistry, SplitHubPayments, CreditToken
```

---

## Getting started

### Prerequisites

- Bun `>= 1.3.8`
- Foundry
- A Privy app
- A Cloudflare account for deploys (local dev runs D1 and Durable Objects locally)

### Setup

```bash
bun install
cp packages/web/.env.example packages/web/.env.local   # set VITE_PRIVY_APP_ID, VITE_APP_URL, OneSignal keys
cp packages/foundry/.env.example packages/foundry/.env  # only for contract work

cd packages/web
bun run db:migrate:local
cd ../..
bun run start                                           # http://localhost:3000
```

Optional local chain: `bun run chain` and `bun run deploy:local`.

### Commands

```bash
bun run start              # dev server
bun run web:check-types
bun run web:lint
bun run web:test           # D1 query engine and schema tests
bun run web:build
bun run test               # contract tests
```

### Deploying

```bash
cd packages/web
bun run db:migrate:remote   # apply D1 migrations to production
bun run deploy              # vite build, then cf deploy --prebuilt
```

Bindings live in `packages/web/cloudflare.config.ts` and public build-time values in `packages/web/.env.production`.
The only Worker secret is `ONESIGNAL_REST_API_KEY`.

---

## Contributing

- Every commit credits Liz Merin George ([@lizgeorge1](https://github.com/lizgeorge1)) as co-author; the
  `.husky/commit-msg` hook adds the trailer automatically.
- The repository is mirrored to [TaraxioT/splithub](https://github.com/TaraxioT/splithub) on every push.

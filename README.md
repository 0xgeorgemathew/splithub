# SplitHub

> Tap-to-pay onchain payments for friends, merchants, and live venues.

SplitHub makes crypto payments feel casual and immediate.

You can split bills with friends, pay merchants, and tap to pay in person with an Arx Halo NFC chip, while a DeFi agent handles liquidity in the background. The result is a payment experience that feels fast and familiar, without forcing users to keep idle cash sitting in a wallet just to be ready to spend.

The most important idea behind the product is simple:

**the chip is for authorization, not storage.**

If the chip is lost, the user does not lose funds. Capital stays under wallet and agent control, continues earning yield, and is pulled just in time when a real payment needs to happen.

---

## Built Product Features

SplitHub is now organized around a few clear product surfaces:

| Feature | User-facing surface | What is built |
| --- | --- | --- |
| **Stores** | `/store` | Store creation, catalogs, checkout, payout splits, analytics, and autonomous store managers |
| **DeFi** | `/defi` | Vincent-connected treasury management with Aave deployment, withdrawal, and planner-driven actions |
| **Agent Pay** | `/agents-pay` | Just-in-time payment readiness, tap limits, and liquidity movement so users can pay without keeping idle balance parked |
| **Split Bills** | `/splits`, `/settle`, `/requests` | Group expenses, balances, payment requests, circles, and settlements |
| **Tap to Pay** | checkout and settlement flows | Arx Halo chip authorization across consumer and merchant payment paths |

Under the hood, these are connected by **Agent Pay**:

- user capital can stay productive in DeFi
- the app checks payment readiness in real time
- the agent can move funds just in time for a valid payment
- users can tap and pay even if their wallet is not sitting preloaded with spendable balance

That is the core product advantage: **capital efficiency without compromising checkout speed**.

---

## Why This Is Interesting

Most crypto payment products make users choose between convenience and safety:

- preload funds into a spend wallet and accept idle capital risk
- keep funds elsewhere and accept a clunky checkout experience

SplitHub avoids that tradeoff.

With SplitHub:

- users split bills and settle debts socially
- merchants can accept tap-driven payments
- event operators can run stalls and venue commerce
- funds can remain in DeFi earning APY until they are actually needed
- the chip never has to be treated like a wallet loaded with meaningful value

It is a more useful mental model for real-world crypto payments:

**tap now, fund only when required.**

---

## Feature Highlights

### 1. Stores

Stores are a full product surface, not just a demo checkout page.

- create merchant storefronts linked to event networks
- manage catalog items and inventory
- split checkout proceeds between manager and admin wallets
- inspect revenue, failed orders, low-stock items, and top sellers
- attach autonomous manager agents that can monitor and act on store health

This turns SplitHub into a commerce operating layer for merchants, stalls, and venue networks.

### 2. DeFi

The DeFi surface gives the treasury layer a dedicated user experience.

- connect to Vincent-backed wallet infrastructure
- inspect Privy, agent, and Aave balances
- generate planner-guided capital allocation decisions
- fund the agent wallet from the user wallet
- deploy idle USDC into Aave
- withdraw capital back when liquidity is needed

The goal is simple: keep payment capital productive instead of idle.

### 3. Agent Pay

Agent Pay is the mechanism that ties checkout and DeFi together.

- evaluate whether a user can cover their configured tap limit
- look at chip-linked wallet balance, agent liquidity, and Aave-backed reserves
- decide whether a top-up or withdrawal is needed right now
- move capital just in time before payment
- let users tap and pay without preloading a dedicated spend wallet

This is the product's core differentiator.

### 4. Social and Tap Payments

SplitHub still keeps the original social payment experience intact:

- create shared expenses
- track balances between friends
- send payment requests
- auto-split activity with circles
- settle with a single tap

The same tap primitive also powers merchant and venue checkout.

---

## How Agent Pay Works

At a high level:

1. A user initiates a tap payment.
2. SplitHub validates the payment context and spending rules.
3. The agent checks whether the payment wallet can already cover the transaction.
4. If not, the system evaluates available liquid balance and DeFi-backed reserves.
5. Funds are moved just in time.
6. The payment completes with the same tap-first experience.

This gives SplitHub two important product qualities:

- **Safety**: funds are not permanently parked on the chip
- **Efficiency**: idle capital can keep earning APY until payment time

---

## Core User Flows

### Split bills

Users log in with Privy, create expenses, add participants, and see live balances update through Supabase. When it is time to settle, a tap authorizes payment and debt is cleared onchain.

### Pay merchants

Users move through a lightweight checkout flow designed for stores, stalls, and venue operators. SplitHub handles payment logic while keeping the interaction short enough for real-world use.

### Tap to pay

An Arx Halo chip signs payment intent. The app coordinates the transaction flow, wallet state, and readiness checks so the tap feels immediate.

### Keep funds productive

Instead of forcing users to hold dead checkout balance, SplitHub can route idle capital into DeFi and pull it back when needed. This is exposed through the **DeFi** and **Agents Pay** surfaces.

---

## Current Product Surface

Active product areas in this repo include:

- Store dashboard, catalog, checkout, analytics, and split-payout order flow
- Store manager agents, agent logs, validations, and restock automation
- DeFi deployment and withdrawal via Vincent + Aave
- Agent-backed treasury, payment readiness, tap limits, and just-in-time funding
- Splits dashboard and balance tracking
- Single-party and multi-party settlement flows
- Payment requests with shareable links
- Circle auto-splitting
- Credits / venue payment UI
- Event and stall payments
- Tap-to-pay chip authorization across social and merchant flows

---

## DeFi Features

The `DeFi` surface in this repo is backed by real planning and execution services, not static portfolio UI.

Built DeFi capabilities include:

- Vincent session handling and wallet discovery
- treasury snapshots across user wallet, agent wallet, and Aave reserve
- planner-driven open-position logic with OpenAI plus deterministic fallback validation
- Privy-to-agent funding transaction construction
- Aave deployment and withdrawal flows
- venue comparison and reasoning UX for capital allocation

At the product level, this is the part of SplitHub that keeps money working while it waits for the next payment.

---

## Agent Pay Features

`Agent Pay` is the payment-readiness layer that makes the tap experience feel liquid even when the user is not holding spendable balance in the payment wallet.

Built Agent Pay capabilities include:

- per-user tap limit configuration
- readiness checks combining chip wallet balance, agent liquid balance, and Aave withdrawable reserves
- recent spend signal analysis for expected payment size
- JIT payment preparation that can decide between existing balance, liquid agent funds, and Aave withdrawal
- payment funding explanations and reasoning UX
- integration into settlement and payment flows so a user can tap first and fund only when required

This is the feature that makes the product feel unusual: **users can pay without keeping idle capital exposed just for checkout readiness**.

---

## Store Platform Features

The store layer is not just a UI mock. The API surface in `packages/nextjs/app/api/stores` implements an actual merchant operations backend for SplitHub's checkout and agent workflows.

### Store APIs

Built store capabilities include:

- store creation with admin, manager, payout split, token, and agent configuration
- wallet-based store dashboard queries for operators
- per-store analytics for revenue, order quality, low-stock items, and top sellers
- catalog item creation, listing, and updates
- checkout quote generation for a live cart
- checkout confirmation with two signed payout legs, one for the manager and one for the admin
- order lifecycle handling for pending, completed, and failed orders
- automatic inventory decrement after successful checkout

This makes the merchant flow more than "tap to pay." It supports **split payouts, operational visibility, and inventory-aware checkout**.

### Store Agent Controls

The store API also exposes agent management primitives:

- create a manager agent for a store
- pause or reactivate that agent
- inspect analytics that help decide when an autonomous run is needed

That means SplitHub is not only enabling merchant payments, but also giving each store an operational automation layer.

---

## Trigger-Powered Automation

The background jobs in `packages/nextjs/trigger` are a major part of the newer product direction.

### Autonomous store runs

`store-agent-run.ts` executes an autonomous store run for a given store and records:

- which store ran
- the run id and state
- how many actions were taken
- the decision summary produced by the run

This is the execution path that turns store agents from a configuration object into something that can actually act.

### Scheduled health scans

`store-health-scan.ts` runs on a schedule and checks active store agents for operational issues such as:

- low-stock items
- failed orders

When a store needs attention, the scan queues a background store-agent run automatically. If everything looks healthy, the store is skipped. In product terms, this means SplitHub now supports **merchant monitoring and intervention loops**, not just checkout.

Together, the store API layer and Trigger jobs add a new product dimension:

**SplitHub is becoming a commerce platform with autonomous operations, not just a tap-to-pay frontend.**

---

## Architecture

SplitHub is a full-stack monorepo.

### Frontend

- Next.js
- React
- Tailwind CSS
- DaisyUI
- Zustand
- Wagmi / Viem
- Privy authentication and embedded wallets

### Payments and NFC

- Arx Halo chip signing
- EIP-712 style authorization flows
- direct wallet submission for payments

### Backend and Data

- Supabase Postgres
- Supabase realtime subscriptions
- app API routes for payments, stores, events, and agent operations
- store APIs for catalog management, analytics, checkout, and agent control
- payment request, settlement, tap-limit, and Vincent treasury endpoints

### Smart Contracts

- Foundry
- Solidity
- OpenZeppelin contracts
- Base Sepolia deployment target

### Agent and DeFi Layer

- Vincent wallet infrastructure
- Aave-backed capital deployment
- OpenAI-powered planning and store agent workflows
- Trigger.dev background jobs for store agents
- scheduled store health scans and autonomous run orchestration
- just-in-time payment funding and readiness evaluation

---

## Repo Layout

```text
packages/
  nextjs/
    app/                  Next.js app routes and API endpoints
    components/           Product UI for splits, credits, events, store, settle
    hooks/                Wallet, chip, settlement, and Vincent hooks
    services/             Product logic, store services, DeFi, treasury, notifications
    lib/                  Shared blockchain, Supabase, and Vincent helpers
    supabase/             Schema reference and migrations

  foundry/
    contracts/            SplitHub contracts
    script/               Deploy and chip registration scripts
    test/                 Contract tests
```

---

## Main Contracts

| Contract | Responsibility |
| --- | --- |
| `SplitHubRegistry` | Links NFC chips to owners |
| `SplitHubPayments` | Payment execution and authorization checks |
| `CreditToken` | Venue credit token logic |

---

## Getting Started

### Prerequisites

- Bun `>= 1.3.8`
- Foundry
- A Supabase project
- A Privy app
- Optional Vincent + OpenAI credentials for Agent Pay and DeFi flows

### 1. Install dependencies

```bash
bun install
```

### 2. Configure the frontend env

Copy the frontend env template:

```bash
cp packages/nextjs/.env.example packages/nextjs/.env.local
```

Important variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_PRIVY_APP_ID=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

RELAYER_PRIVATE_KEY=0x...

VINCENT_API_KEY=ssk_...
VINCENT_API_BASE=https://heyvincent.ai

OPENAI_API_KEY=sk_...
OPENAI_STORE_AGENT_MODEL=gpt-5.4-mini

NEXT_PUBLIC_ONESIGNAL_APP_ID=...
ONESIGNAL_REST_API_KEY=...

STORE_SUPPLIER_WEBHOOK_URL=...
STORE_SUPPLIER_SHARED_SECRET=...
STORE_SUPPLIER_TIMEOUT_MS=15000
```

### 3. Configure Foundry env

```bash
cp packages/foundry/.env.example packages/foundry/.env
```

Fill in RPC, verification, and deployer configuration as needed.

### 4. Start the app

From the repo root:

```bash
bun run start
```

Or run the Next.js app directly:

```bash
cd packages/nextjs
bun run dev
```

### 5. Optional local chain workflow

```bash
bun run chain
bun run deploy:local
```

---

## Useful Commands

### App

```bash
bun run start
bun run next:lint
bun run next:check-types
bun run next:build
```

### Contracts

```bash
bun run chain
bun run compile
bun run test
bun run deploy:local
bun run deploy:base
```

### Trigger.dev store agents

```bash
cd packages/nextjs
bun run dev:trigger
```

---

## Recommended Demo Routes

If you want to understand the product quickly, start here:

- `/store`
- `/defi`
- `/agents-pay`
- `/splits`
- `/settle`
- `/credits`
- `/events`

---

## Product Notes

### Security posture

SplitHub is designed so that the **chip is not the vault**.

That matters because:

- losing the chip should not mean losing funds
- payment authorization can stay lightweight
- spending controls can be enforced at the wallet and agent layer
- funds can remain elsewhere until the moment payment is actually required

### Why APY matters here

Most payment products ignore idle capital.

SplitHub treats idle payment capital as treasury that can be actively managed. If money is waiting around for the next tap, the system can route it into DeFi and bring it back just in time, making the payment experience better without making capital less useful.

---

## Documentation

Additional docs in this repo:

- [lit-code-dev.md](./lit-code-dev.md)
- [lit-code-usage.md](./lit-code-usage.md)

---

## Status

SplitHub is an active prototype/product build that combines:

- social expense splitting
- merchant and venue payments
- NFC-based tap authorization
- agent-backed just-in-time funding
- DeFi-powered capital efficiency

If you are evaluating the project, the best way to understand it is to view it not as a simple crypto checkout app, but as a **tap-native payments system with an agent-managed treasury layer**.

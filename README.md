# SplitHub

> Tap-to-pay onchain payments for friends, merchants, and live venues.

SplitHub makes crypto payments feel casual and immediate.

You can split bills with friends, pay merchants, and tap to pay in person with an Arx Halo NFC chip, while a DeFi agent handles liquidity in the background. The result is a payment experience that feels fast and familiar, without forcing users to keep idle cash sitting in a wallet just to be ready to spend.

The most important idea behind the product is simple:

**the chip is for authorization, not storage.**

If the chip is lost, the user does not lose funds. Capital stays under wallet and agent control, continues earning yield, and is pulled just in time when a real payment needs to happen.

---

## What SplitHub Does

SplitHub currently brings together three user-facing payment experiences:

| Surface | What it feels like | Why it matters |
| --- | --- | --- |
| **Split Bills** | Like a tap-native, onchain Splitwise | Track shared expenses, balances, and settle with one tap |
| **Merchant Payments** | Fast NFC checkout for stores and stalls | Accept USDC-powered payments without typical wallet friction |
| **Tap to Pay** | Physical chip interaction with instant authorization | Makes onchain spending feel real-world and natural |

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

## Product Pillars

### 1. Social Payments

SplitHub started with shared expenses and still treats that as a first-class flow.

- Create group expenses
- Track who owes whom
- Settle balances with a single tap
- Send and receive payment requests
- Auto-split activity using circles

This turns onchain settlement into something that feels lightweight instead of ceremonial.

### 2. Merchant and Venue Checkout

SplitHub also supports real-world commerce flows:

- merchant checkout
- event stalls
- venue credit experiences
- store catalogs and split revenue logic

The same tap interaction that settles between friends can also power point-of-sale experiences.

### 3. Agent Pay

This is the differentiator.

SplitHub integrates a Vincent-powered DeFi agent that can:

- monitor wallet readiness
- evaluate available liquidity
- move funds just in time for payments
- keep capital productive in Aave when idle
- support tap-limit based spending controls

In practice, that means a user can tap to pay **without needing to keep their wallet sitting loaded for every future purchase**.

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

- Splits dashboard and balance tracking
- Single-party and multi-party settlement flows
- Payment requests with shareable links
- Circle auto-splitting
- Credits / venue payment UI
- Event and stall payments
- Store dashboard, catalog, checkout, and analytics
- Agent-backed treasury and readiness flows
- DeFi deployment and withdrawal via Vincent + Aave
- Store agents with autonomous restock infrastructure

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

- `/splits`
- `/settle`
- `/credits`
- `/events`
- `/store`
- `/defi`
- `/agents-pay`

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

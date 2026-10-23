# SplitHub

SplitHub is a tap-to-pay onchain payments product with four active feature pillars:

- `Stores` for merchant checkout, analytics, and autonomous store operations
- `DeFi` for Vincent-connected treasury management and Aave deployment
- `Agent Pay` for just-in-time liquidity and tap-limit-backed payment readiness
- `Splits` for shared expenses, payment requests, circles, and settlement

The physical tap experience is powered by Arx Halo NFC chips, but the chip is not treated as the place where meaningful value lives. Capital can stay in wallets and DeFi until payment time.

## Stack

- **Frontend:** Next.js 16 App Router on vinext (Vite), React 19, Tailwind CSS 4, DaisyUI 5
- **Hosting:** Cloudflare Workers (`splithub` Worker on `splithub.space`), configured in `packages/nextjs/cloudflare.config.ts`
- **Wallet/Auth:** Privy, Wagmi, Viem
- **NFC:** `@arx-research/libhalo`
- **Backend/Data:** Cloudflare D1 (SQLite) behind a supabase-js compatible layer (`lib/db`), Durable Object realtime, R2
- **Agent Infra:** Vincent, OpenAI, Cloudflare Workflows + Cron Triggers
- **Contracts:** Foundry, Solidity 0.8.19, OpenZeppelin, Base Sepolia (`84532`)
- **Runtime:** Bun workspaces

## Product Surfaces

### 1. Stores

Merchant and venue commerce surface.

- store creation and operator dashboard
- public store browsing
- catalog and inventory management
- split-recipient checkout between manager and admin
- store analytics
- manager agents with run history and validations
- supplier restock integration
- scheduled store health scans via Cron Trigger, agent runs via Workflows

Primary routes:

- `/store`
- `/store/[networkSlug]/[storeSlug]`

Primary code:

- `packages/nextjs/app/api/stores`
- `packages/nextjs/services/store`
- `packages/nextjs/worker`

### 2. DeFi

Treasury and yield surface.

- Vincent wallet session handling
- wallet snapshot across Privy, agent wallet, and Aave
- OpenAI planner with deterministic fallback
- open position / withdraw flows
- capital deployment to Aave

Primary route:

- `/defi`

Primary code:

- `packages/nextjs/app/api/vincent`
- `packages/nextjs/services/agentPlannerService.ts`
- `packages/nextjs/services/internalTreasuryService.ts`
- `packages/nextjs/services/vincentExecutionService.ts`
- `packages/nextjs/services/vincentWalletService.ts`

### 3. Agent Pay

Just-in-time payment liquidity layer.

- payment readiness evaluation
- per-user tap-limit support
- top-up and withdraw decisioning
- JIT funding before payment
- payment reasoning UX

Primary route:

- `/agents-pay`

Primary code:

- `packages/nextjs/services/paymentReadinessService.ts`
- `packages/nextjs/services/jitPaymentService.ts`
- `packages/nextjs/services/jitReasoningService.ts`
- `packages/nextjs/app/api/user/tap-limit/route.ts`
- `packages/nextjs/app/api/vincent/prepare-payment/route.ts`
- `packages/nextjs/app/api/vincent/readiness/route.ts`

### 4. Splits and Tap Payments

Original social payment surface, still active.

- group expenses
- live balances
- payment requests
- circles and auto-splitting
- settle and multi-settle flows
- chip-driven tap authorization

Primary routes:

- `/splits`
- `/expense/add`
- `/settle`
- `/settle/[requestId]`
- `/multi-settle`
- `/request/create`
- `/requests`

## Repo Structure

```text
packages/nextjs/
  app/
    store/                  Store product routes
    defi/                   DeFi route
    agents-pay/             Agent Pay route
    splits/, settle/        Social payment routes
    api/stores/             Store backend APIs
    api/vincent/            DeFi + Agent Pay APIs
    api/payment-requests/   Payment request APIs
    api/events/             Event + stall APIs
    api/supplier/           Supplier adapter endpoint
  components/
    store/                  Store UI and agent run UI
    splits/                 Balance and settlement UI
    settle/                 Payment settlement flows
    credits/                Venue credit UI
    events/                 Event and stall management UI
  services/
    store/                  Store, checkout, analytics, agents, supplier logic
    agentPlannerService.ts  DeFi planning
    jitPaymentService.ts    Agent Pay JIT top-up logic
    paymentReadinessService.ts
    vincentExecutionService.ts
  lib/db/                   D1 query layer (supabase-js compatible), realtime client, browser policy
  migrations/               D1 schema migrations (source of truth; mirrored by lib/db/schema.ts)
  worker/
    index.ts                Worker entry: realtime upgrade, cron handler, exports
    realtime-hub.ts         RealtimeHub Durable Object (postgres_changes replacement)
    store-agent-workflow.ts StoreAgentRunWorkflow

packages/foundry/
  contracts/
    SplitHubRegistry.sol
    SplitHubPayments.sol
    CreditToken.sol
```

## Contracts

- **SplitHubRegistry**: maps chip addresses to owners
- **SplitHubPayments**: payment execution and auth checks
- **CreditToken**: venue credits token

## Data Layer

- `supabase` from `~~/lib/supabase` is the D1 client (`lib/db`): same builder API (`from().select().eq()...`,
  embeds like `users!payer_wallet(name)`, `!inner`, `or()`, `upsert`, `single`/`maybeSingle`, `PGRST116`).
- Server code runs plans directly on D1; browser code POSTs plans to `/api/db`, gated by `lib/db/policy.ts`
  (reads open, writes only for the tables/actions client code performs).
- `supabase.channel().on("postgres_changes", ...)` is served by the `RealtimeHub` Durable Object; every write
  through `lib/db` publishes changes.
- Schema changes: add a file under `migrations/`, update `lib/db/schema.ts`, run `bun run test` (checks they match).
- ERC-8004 evidence documents whose hashes go onchain are stored verbatim in R2 (`services/store/evidenceStore.ts`).

## Database Areas

### Social payments

- `users`
- `expense`
- `expense_participants`
- `settlements`
- `payment_requests`
- `circles`
- `circle_members`

### Events and stores

- `events`
- `stalls`
- `stall_payments`
- `store_items`
- `store_inventory`
- `store_orders`
- `store_order_items`

### Store agents

- `manager_agents`
- `agent_runs`
- `agent_validations`

## Important Flows

### Store checkout

1. Build a quote for the cart.
2. Split payout between manager and admin recipients.
3. Collect signed payment legs from the buyer flow.
4. Persist the order.
5. Complete checkout and decrement inventory.

Relevant files:

- `packages/nextjs/app/api/stores/[storeId]/checkout/route.ts`
- `packages/nextjs/services/store/storeCheckout.ts`

### Store automation

1. A manager agent is created for a store.
2. Manual or scheduled runs are queued.
3. The agent inspects store state and analytics.
4. Safe actions can be taken through structured tools.
5. Restock requests can be sent to a supplier adapter.

Relevant files:

- `packages/nextjs/services/store/storeAgentRuntime.ts`
- `packages/nextjs/services/store/storeAgentQueue.ts`
- `packages/nextjs/worker/store-agent-workflow.ts`
- `packages/nextjs/services/store/supplierService.ts`

### DeFi deployment

1. User connects Vincent-backed session.
2. Wallet snapshot is fetched.
3. Planner computes valid capital actions.
4. Funds can move from Privy wallet to agent wallet.
5. Idle funds can be deployed to Aave or withdrawn back.

Relevant files:

- `packages/nextjs/app/defi/page.tsx`
- `packages/nextjs/services/agentPlannerService.ts`
- `packages/nextjs/services/internalTreasuryService.ts`

### Agent Pay

1. User configures a tap limit.
2. SplitHub computes readiness from chip wallet, agent liquidity, and Aave reserve.
3. JIT funding path is chosen.
4. Funds move only when required for payment.

Relevant files:

- `packages/nextjs/app/agents-pay/page.tsx`
- `packages/nextjs/services/paymentReadinessService.ts`
- `packages/nextjs/services/jitPaymentService.ts`

## Product Constraints

- Treat `Stores`, `DeFi`, and `Agent Pay` as first-class product features.
- Do not describe the app as only bill splitting; that is now incomplete.
- The chip should be described as an authorization device, not a stored-value vault.
- Prefer saying the product enables payment without keeping idle balance parked for checkout readiness.
- Current product messaging should emphasize:
  - merchant/store commerce
  - DeFi-backed treasury management
  - just-in-time liquidity for tap payments

## Key Files

- `packages/nextjs/app/store/page.tsx`
- `packages/nextjs/app/defi/page.tsx`
- `packages/nextjs/app/agents-pay/page.tsx`
- `packages/nextjs/app/api/stores/dashboard/route.ts`
- `packages/nextjs/app/api/stores/[storeId]/checkout/route.ts`
- `packages/nextjs/app/api/stores/[storeId]/agent/create/route.ts`
- `packages/nextjs/app/api/stores/[storeId]/agent/pause/route.ts`
- `packages/nextjs/app/api/stores/[storeId]/agent/runs/trigger/route.ts`
- `packages/nextjs/services/store/storeAnalytics.ts`
- `packages/nextjs/services/store/storeAgentRuntime.ts`
- `packages/nextjs/services/paymentReadinessService.ts`
- `packages/nextjs/services/jitPaymentService.ts`
- `packages/nextjs/services/agentPlannerService.ts`
- `packages/nextjs/services/store/storeAgentQueue.ts`
- `packages/nextjs/worker/index.ts`
- `packages/nextjs/lib/db/engine.ts`
- `packages/nextjs/cloudflare.config.ts`

## Commands

```bash
bun install
bun run start
bun run chain
bun run deploy:local
bun run deploy:base
bun run next:lint
bun run next:check-types
bun run next:test
bun run next:deploy
bun run test
```

Cloudflare (from `packages/nextjs`):

```bash
bun run db:migrate:local    # local D1 used by `bun run dev`
bun run db:migrate:remote   # production D1
bun run deploy              # vite build + cf deploy (do not run plain `cf deploy`: it runs `next build`)
```

## Routes Worth Checking

- `/store`
- `/defi`
- `/agents-pay`
- `/splits`
- `/settle`
- `/credits`
- `/events`
- `/request/create`
- `/requests`
- `/register`
- `/approve`

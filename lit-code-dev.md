# SplitHub Lit Code Dev

This is the implementation reference for the Lit-specific parts of SplitHub.

## What "Lit" Means Here

In this repo, "Lit" means `Vincent`.

SplitHub uses Vincent as:

- a backend-controlled Smart Wallet
- a policy-gated onchain execution layer
- the wallet that holds Aave positions
- the just-in-time top-up source for chip payments

SplitHub does **not** currently use:

- Vincent MCP
- Vincent App SDK / Connect
- OpenClaw
- Lit Actions
- per-user Vincent wallets

The current code path is Vincent REST only.

## Current Hackathon Architecture

Actors:

- `Privy wallet`: user-facing wallet
- `chip wallet`: actual tap signer / direct payer in chip-pay flows
- `Vincent Smart Wallet`: shared execution wallet for the demo

Current rule set:

- idle Vincent balance should be deployed into Aave
- chip payments should be funded only when needed
- user tap amount is capped by `users.tap_limit_usd`

## Required Environment Variables

Put these in [packages/nextjs/.env.local](/Users/george/Workspace/splithub/packages/nextjs/.env.local):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_PRIVY_APP_ID=...

VINCENT_API_KEY=ssk_...
VINCENT_API_BASE=https://heyvincent.ai

OPENAI_API_KEY=sk_...
```

Notes:

- `VINCENT_API_KEY` is server-side only
- `OPENAI_API_KEY` is used by the DeFi planner
- there are no Lit/Vincent SDK package credentials in the current repo because the repo uses REST, not the App SDK

## Key Lit / Vincent Files

Core client:

- [packages/nextjs/lib/vincent.ts](/Users/george/Workspace/splithub/packages/nextjs/lib/vincent.ts)

Execution:

- [packages/nextjs/services/vincentExecutionService.ts](/Users/george/Workspace/splithub/packages/nextjs/services/vincentExecutionService.ts)
- [packages/nextjs/services/vincentWalletService.ts](/Users/george/Workspace/splithub/packages/nextjs/services/vincentWalletService.ts)
- [packages/nextjs/services/jitPaymentService.ts](/Users/george/Workspace/splithub/packages/nextjs/services/jitPaymentService.ts)
- [packages/nextjs/services/paymentReadinessService.ts](/Users/george/Workspace/splithub/packages/nextjs/services/paymentReadinessService.ts)
- [packages/nextjs/services/agentPlannerService.ts](/Users/george/Workspace/splithub/packages/nextjs/services/agentPlannerService.ts)

Routes:

- [packages/nextjs/app/api/vincent/secret/route.ts](/Users/george/Workspace/splithub/packages/nextjs/app/api/vincent/secret/route.ts)
- [packages/nextjs/app/api/vincent/wallets/route.ts](/Users/george/Workspace/splithub/packages/nextjs/app/api/vincent/wallets/route.ts)
- [packages/nextjs/app/api/vincent/plan/route.ts](/Users/george/Workspace/splithub/packages/nextjs/app/api/vincent/plan/route.ts)
- [packages/nextjs/app/api/vincent/open-position/route.ts](/Users/george/Workspace/splithub/packages/nextjs/app/api/vincent/open-position/route.ts)
- [packages/nextjs/app/api/vincent/prepare-payment/route.ts](/Users/george/Workspace/splithub/packages/nextjs/app/api/vincent/prepare-payment/route.ts)
- [packages/nextjs/app/api/vincent/readiness/route.ts](/Users/george/Workspace/splithub/packages/nextjs/app/api/vincent/readiness/route.ts)

UI:

- [packages/nextjs/app/defi/page.tsx](/Users/george/Workspace/splithub/packages/nextjs/app/defi/page.tsx)
- [packages/nextjs/app/agents-pay/page.tsx](/Users/george/Workspace/splithub/packages/nextjs/app/agents-pay/page.tsx)
- [packages/nextjs/app/settle/page.tsx](/Users/george/Workspace/splithub/packages/nextjs/app/settle/page.tsx)

## Vincent REST Surface Used

The current client in [vincent.ts](/Users/george/Workspace/splithub/packages/nextjs/lib/vincent.ts) uses:

- `GET /api/skills/evm-wallet/address`
- `GET /api/skills/evm-wallet/balances`
- `POST /api/skills/evm-wallet/send-transaction`
- `POST /api/skills/evm-wallet/transfer`

Meaning:

- SplitHub resolves the Vincent smart account
- reads wallet inventory from Vincent
- encodes Aave calldata locally with `viem`
- asks Vincent to sign and submit the actual transaction

## DeFi Flow

Page: [packages/nextjs/app/defi/page.tsx](/Users/george/Workspace/splithub/packages/nextjs/app/defi/page.tsx)

Flow:

1. Read Privy balance, Vincent liquid balance, and Vincent Aave position
2. Build a planner snapshot
3. Ask OpenAI for a deployment plan
4. Validate the plan server-side
5. If funding is required, return a client-side funding step
6. Execute Aave supply via Vincent

Planner:

- model: `gpt-5.4-mini`
- schema validated with `zod`
- planner file: [packages/nextjs/services/agentPlannerService.ts](/Users/george/Workspace/splithub/packages/nextjs/services/agentPlannerService.ts)

Important:

- OpenAI is the planner
- Vincent is the executor
- Lit is not the LLM layer here

## Agents Pay Flow

Page: [packages/nextjs/app/agents-pay/page.tsx](/Users/george/Workspace/splithub/packages/nextjs/app/agents-pay/page.tsx)

Current payment model:

- the user sets a `tap_limit_usd`
- on payment attempt, SplitHub checks the paying wallet balance
- if needed, Vincent withdraws the exact shortfall from Aave
- Vincent transfers that shortfall to the wallet that will actually pay

Current JIT route:

- [packages/nextjs/app/api/vincent/prepare-payment/route.ts](/Users/george/Workspace/splithub/packages/nextjs/app/api/vincent/prepare-payment/route.ts)

Current JIT service:

- [packages/nextjs/services/jitPaymentService.ts](/Users/george/Workspace/splithub/packages/nextjs/services/jitPaymentService.ts)

Tap limit storage:

- `users.tap_limit_usd`
- migration: [packages/nextjs/supabase/migrations/005_add_tap_limit_to_users.sql](/Users/george/Workspace/splithub/packages/nextjs/supabase/migrations/005_add_tap_limit_to_users.sql)

## Important Product Constraints

These are true in the current implementation:

- the hackathon build uses one shared Vincent Smart Wallet
- Vincent keys are backend-only
- the repo is not yet a per-user Vincent architecture
- direct chip payment and contract-based payment flows both still exist in the repo
- the cleanest Agents Pay direction is direct chip payment, not Privy-in-the-middle settlement

## Important Lit / Vincent Constraints

- Vincent can return `executed`, `denied`, or `pending_approval`
- the current implementation assumes the configured Vincent wallet can execute without human approval for the demo
- Vincent execution is non-custodial from the app’s perspective, but the `ssk_...` key is still a high-value backend credential
- do not expose `VINCENT_API_KEY` to the browser

## Future Workflows

These are the recommended next steps after the hackathon:

1. Separate Agents Pay fully from the older `SplitHubPayments` contract flow.
2. Make chip-pay the canonical final sender for Agents Pay.
3. Batch Vincent-side steps where possible:
   - Aave withdraw
   - Vincent transfer to chip
4. Add gas strategy for direct chip payment:
   - chip ETH buffer, or
   - JIT gas top-up
5. Move from one shared Vincent wallet to per-user Vincent wallets if the product matures.
6. If per-user Vincent wallets become necessary, re-evaluate Vincent App SDK / Connect instead of staying on the shared REST secret model.

## Development Rules For This Repo

- Keep Lit/Vincent logic server-side
- Keep planner validation deterministic even if the planner uses an LLM
- Treat Vincent as execution infrastructure, not as the source of business truth
- Use SplitHub DB state to decide who can be paid and how much
- Prefer direct chip payment for Agents Pay
- Keep judge/demo flows simple and explicit in the UI

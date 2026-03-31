# SplitHub

Tap-to-pay crypto payments with Arx Halo chips, Privy wallets, and a Lit-powered Vincent Smart Wallet.

## What This Repo Does

SplitHub has three active surfaces:

- `Splits`: track balances and settle between users
- `Agents Pay`: just-in-time chip funding backed by Vincent + Aave
- `DeFi`: deploy idle Vincent balance into Aave with an OpenAI planner

## Lit / Vincent In This Repo

This repo uses `Vincent`, the Lit Protocol execution layer, as backend wallet infrastructure.

Current implementation:

- one shared Vincent Smart Wallet for the hackathon demo
- Vincent REST API, authenticated with `VINCENT_API_KEY`
- Aave supply/withdraw executed by Vincent
- chip payments topped up just in time from the Vincent wallet

Not currently used in code:

- Vincent MCP
- Vincent App SDK / Connect
- OpenClaw
- per-user Vincent wallets

## Docs

- [lit-code-dev.md](./lit-code-dev.md): implementation details, architecture, env vars, and future workflows
- [lit-code-usage.md](./lit-code-usage.md): judge/demo usage guide

## Quick Start

1. Install dependencies

```bash
bun install
```

2. Configure env

Copy `packages/nextjs/.env.example` to `packages/nextjs/.env.local` and set at least:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_PRIVY_APP_ID=...
VINCENT_API_KEY=ssk_...
OPENAI_API_KEY=sk_...
```

3. Run the app

```bash
cd packages/nextjs
bun run dev
```

4. Open:

- `/defi`
- `/agents-pay`
- `/settle`

## Main Commands

```bash
bun run dev
bun run check-types
bun run lint
```

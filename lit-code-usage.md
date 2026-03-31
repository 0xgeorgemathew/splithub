# SplitHub Lit Code Usage

This is the short usage guide for hackathon judges.

## What Lit Does In The Demo

SplitHub uses `Vincent`, from Lit Protocol, as the backend Smart Wallet layer.

In the demo, Lit/Vincent is responsible for:

- holding the shared Smart Wallet
- holding the Aave position
- withdrawing from Aave when funds are needed
- topping up the payment wallet just in time
- executing DeFi actions from the backend

OpenAI plans DeFi actions.
Vincent executes them.
The chip is still the user-facing payment action.

## Pages To Test

### 1. DeFi

Open:

- `http://localhost:3000/defi`

What to look for:

- Vincent connection status
- Privy wallet balance
- Vincent liquid balance
- Aave deployed balance
- `Deploy Idle Balance` action

What happens:

- SplitHub reads balances
- OpenAI creates a simple Aave plan
- Vincent executes the supply transaction

### 2. Agents Pay

Open:

- `http://localhost:3000/agents-pay`

What to look for:

- user tap limit
- chip wallet balance
- Vincent Aave backing
- top-up needed now

What happens:

- SplitHub calculates whether Vincent can cover the user’s configured tap limit
- if the payment wallet is short, Vincent prepares the exact shortfall just in time

### 3. Test Payment

From `/agents-pay`, click `Open test payment`.

This opens:

- `http://localhost:3000/settle`

What to look for:

- one clear payment screen
- immediate transition into progress state after tapping
- explicit step-by-step status while the payment flow runs

## Required Demo Configuration

The demo expects these env vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_PRIVY_APP_ID=...
VINCENT_API_KEY=ssk_...
OPENAI_API_KEY=sk_...
```

## Default Test Recipient

The default test recipient is:

- `0x59d4C5BE20B41139494b3F1ba2A745ad9e71B00B`

## What Is Important For Judges

- users do not handle the Vincent key directly
- Lit/Vincent runs as the backend wallet and execution layer
- chip tap stays the visible payment interaction
- Aave capital is only pulled when needed in the JIT payment flow
- DeFi deployment is AI-planned and Vincent-executed

## Current Demo Scope

This hackathon build intentionally keeps the Lit integration simple:

- one shared Vincent Smart Wallet
- Vincent REST API
- no MCP setup required
- no Vincent dashboard interaction required during the live demo

That keeps the flow short enough to judge live while still showing real Lit-powered execution.

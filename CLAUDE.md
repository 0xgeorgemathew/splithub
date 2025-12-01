# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is SplitHub?

SplitHub is a tap-to-pay bill splitting app. Users tap their NFC chip to pay friends instantly—no wallet popups, no transaction confirmations, no gas fees.

### Problems We Solve

1. **Bill splitting is awkward** — Venmo requests, IOUs, "I'll get you next time" never happens
2. **Crypto payments are confusing** — Seed phrases, gas fees, wallet confirmations scare normal users
3. **Group payments are chaos** — Collecting money from 6 friends at dinner is a nightmare

### How SplitHub Fixes This

- **One tap to pay** — NFC chip handles authentication and signing
- **Gasless transactions** — Relayer pays gas, users pay nothing
- **Instant settlement** — No pending transactions, no waiting
- **No crypto knowledge needed** — All blockchain complexity hidden from users

## User Flows

### Onboarding (`/register`)
New user setup in 2 steps:
1. Enter name and email to create profile
2. Tap NFC chip twice to register it to your wallet

### Home Dashboard (`/`)
- See all friends and balances at a glance
- Green = money owed to you, Red = you owe them
- Tap a friend card to settle the debt instantly

### Quick Payment (`/settle`)
Simple tap-to-pay flow:
1. Enter amount and recipient
2. Tap your NFC chip
3. Watch progress: Tap → Sign → Send → Confirm
4. Done—payment complete

### Payment Links (`/settle/[requestId]`)
Receive a payment request via link/QR:
1. Open link showing who you owe and how much
2. Tap your chip to pay
3. Auto-redirect to confirmation

### Group Payments (`/multi-settle`)
Collect money from multiple people:
1. Create payment slots for each person
2. Each participant taps their chip in turn
3. Track who's paid, who hasn't

### Credits System (`/credits`)
Two-part POS terminal for activity venues:

**Buy Credits Tab:**
- Enter USDC amount to spend
- Tap chip to purchase (1 USDC = 10 credits)
- Credits added to your balance

**Activity Zone Tab:**
- Browse available activities with credit costs
- Select activity, tap chip to spend credits
- Gain access to the activity

### Token Approval (`/approve`)
One-time setup before payments work:
- Approve tokens for the Payments or Credits contract
- Required for gasless transactions to execute

## Commands

```bash
# Development
yarn chain              # Start local Anvil chain
yarn deploy             # Deploy contracts to local chain
yarn start              # Start Next.js dev server (localhost:3000)

# Testing
yarn foundry:test       # Run all Forge tests
yarn test:registry      # Test SplitHubRegistry
yarn test:credit        # Test CreditToken

# Deployment
yarn deploy:local       # Deploy to localhost
yarn deploy:base        # Deploy to Base Sepolia

# Code Quality
yarn lint               # Lint both frontend and contracts
yarn format             # Format all code
yarn next:check-types   # TypeScript type checking
```

## Architecture

**Monorepo Structure** (Yarn Workspaces):
- `packages/foundry/` - Solidity contracts with Foundry
- `packages/nextjs/` - Next.js 15 frontend with App Router

### Smart Contracts

| Contract | Purpose |
|----------|---------|
| `SplitHubRegistry` | Links NFC chip addresses to user wallets |
| `SplitHubPayments` | Executes gasless token transfers via chip signatures |
| `CreditToken` | ERC20 credits: buy with USDC, spend at activities |

### Frontend

- **Scaffold-ETH hooks** in `packages/nextjs/hooks/scaffold-eth/` for contract interaction
- **Contract ABIs** auto-generated at `packages/nextjs/contracts/deployedContracts.ts`
- **Config**: `packages/nextjs/scaffold.config.ts` for target networks

### Pages Summary

| Route | User Action |
|-------|-------------|
| `/` | View balances, tap friend to settle |
| `/register` | Create profile, register NFC chip |
| `/settle` | Quick one-tap payment |
| `/multi-settle` | Collect from multiple payers |
| `/settle/[requestId]` | Pay via shared link |
| `/approve` | Approve tokens for gasless payments |
| `/credits` | Buy credits with USDC, spend at activities |

## Adding a New Contract

1. **Deploy script** (`packages/foundry/script/Deploy{ContractName}.s.sol`):
   ```solidity
   ContractName c = new ContractName();
   deployments.push(Deployment({ name: "ContractName", addr: address(c) }));
   ```

2. **Test file** (`packages/foundry/test/{ContractName}.t.sol`)

3. **Yarn shortcuts** (add to both `packages/foundry/package.json` and root `package.json`):
   ```json
   "test:{name}": "forge test --match-contract {ContractName}Test -vvv"
   "deploy:{name}:local": "node scripts-js/parseArgs.js --file Deploy{ContractName}.s.sol --network localhost"
   "deploy:{name}:base": "node scripts-js/parseArgs.js --file Deploy{ContractName}.s.sol --network baseSepolia"
   ```

## Formatting

- Solidity: 120 char lines, 4-space tabs, double quotes (see `foundry.toml`)
- TypeScript: Prettier config in `packages/nextjs/.prettierrc.js`
- Path alias: `~~/*` resolves to `packages/nextjs/`

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

### Landing Page (`/`)
Marketing page for new visitors:
- Hero section with value proposition
- Feature cards highlighting key benefits
- How it works section for both Friends and Venues use cases
- Footer with links

### Onboarding (`/register`)
New user setup in 2 steps:
1. Enter name and email to create profile
2. Tap NFC chip twice to register it to your wallet

### Re-Register Chip (`/re-register`)
Dev mode utility to re-register an NFC chip:
1. Connect wallet
2. Tap chip to detect address
3. Sign EIP-712 registration
4. Chip linked to wallet via relayer

### Splits Dashboard (`/splits`)
- See all friends and balances at a glance
- Green = money owed to you, Red = you owe them
- Tap a friend card to settle the debt instantly

### Add Expense (`/expense/add`)
Create a new expense split:
1. Enter description (dinner, groceries, etc.)
2. Select friends to split with
3. Enter total amount in USDC
4. View per-person split summary
5. Submit to create expense in database

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
POS terminal interface for activity venues:

**Buy Credits:**
- Enter USDC amount to spend
- Tap chip to purchase (1 USDC = 10 credits)
- Credits added to your balance

### Browse Activities (`/activities`)
- View list of available activities
- See credit cost for each
- Navigate to specific activity page

### Activity Access (`/activity/[activityId]`)
Spend credits at a specific activity:
1. View activity name and credit cost
2. Tap chip to deduct credits
3. Receipt printer animation shows transaction
4. Gain access to activity

### Token Approval (`/approve`)
One-time setup before payments work:
- Approve tokens for the Payments or Credits contract
- Required for gasless transactions to execute

## Commands

```bash
# Development
yarn chain              # Start local Anvil chain
yarn deploy             # Deploy all contracts to local chain
yarn start              # Start Next.js dev server (localhost:3000)

# Testing
yarn foundry:test       # Run all Forge tests
yarn test:registry      # Test SplitHubRegistry
yarn test:payments      # Test SplitHubPayments
yarn test:credittoken   # Test CreditToken

# Contract Deployment
yarn deploy:local                # Deploy all contracts to localhost
yarn deploy:base                 # Deploy all contracts to Base Sepolia
yarn deploy:payments:local       # Deploy SplitHubPayments to localhost
yarn deploy:payments:base        # Deploy SplitHubPayments to Base Sepolia
yarn register:local              # Run RegisterChip script on localhost
yarn register:base               # Run RegisterChip script on Base Sepolia

# Code Quality
yarn lint               # Lint both frontend and contracts
yarn format             # Format all code
yarn next:check-types   # TypeScript type checking
```

## Architecture

**Monorepo Structure** (Yarn Workspaces):
- `packages/foundry/` - Solidity contracts with Foundry
- `packages/nextjs/` - Next.js 15 frontend with App Router

**Target Network**: Base Sepolia (configured in `scaffold.config.ts`)

### Smart Contracts

| Contract | Purpose |
|----------|---------|
| `SplitHubRegistry` | Links NFC chip addresses to user wallets via EIP-712 signatures |
| `SplitHubPayments` | Executes gasless token transfers via chip signatures |
| `CreditToken` | ERC20 credits: buy with USDC, spend at activities |
| `ISplitHubRegistry` | Interface for registry contract |

### API Routes (Relayer)

Gasless transaction relayer endpoints in `packages/nextjs/app/api/`:

| Route | Purpose |
|-------|---------|
| `/api/relay/register` | Gasless chip registration |
| `/api/relay/payment` | Single gasless payment |
| `/api/relay/batch-payment` | Multi-recipient batch payments |
| `/api/relay/credit-purchase` | Buy credits with USDC |
| `/api/relay/credit-spend` | Spend credits at activities |
| `/api/payment-requests/` | Payment request CRUD |
| `/api/balances/token` | Token balance queries |
| `/api/settlements` | Settlement tracking |

### Frontend Hooks

Located in `packages/nextjs/hooks/`:

| Directory | Purpose |
|-----------|---------|
| `scaffold-eth/` | Contract interaction (read, write, events) |
| `halochip-arx/` | NFC chip signing (`useHaloChip`) |
| `credits/` | Credit hooks (`useCreditBalance`, `useCreditPurchase`, `useCreditSpend`) |
| `activity/` | Activity transaction events (`useTxEvents`) |

### Frontend Components

Located in `packages/nextjs/components/`:

| Directory | Purpose |
|-----------|---------|
| `landing/` | Landing page UI (HeroSection, FeatureCards, DualHowItWorks, LandingFooter, Animations) |
| `settle/` | Settlement flow UI (SettleFlow, SettleModal, MultiSettleFlow) |
| `credits/` | POS terminal UI (POSHardwareFrame, POSAmountEntry, POSReceiptPrinter, POSFullScreen) |
| `activity/` | Activity UI (ActivityDeviceFrame, ActivityReceiptPrinter, DotMatrixDisplay, ActivitySelector) |
| `expense/` | Expense form (AddExpenseForm, AmountInput, FriendSelector, SplitSummary) |
| `home/` | Dashboard components (FriendBalancesList) |
| `scaffold-eth/` | Wallet connection, address display |

### Services

Located in `packages/nextjs/services/`:

| Service | Purpose |
|---------|---------|
| `expenseService.ts` | Create/read expenses (Supabase) |
| `userService.ts` | User profile management |
| `balanceService.ts` | Balance calculations |
| `store/store.ts` | Client-side state store |

### Configuration

| File | Purpose |
|------|---------|
| `packages/nextjs/scaffold.config.ts` | Target networks, RPC config |
| `packages/nextjs/config/activities.ts` | Activity definitions (name, credits, icon) |
| `packages/nextjs/contracts/deployedContracts.ts` | Auto-generated contract ABIs |

### Pages Summary

| Route | User Action |
|-------|-------------|
| `/` | Landing page for new visitors |
| `/splits` | View balances, tap friend to settle |
| `/register` | Create profile, register NFC chip |
| `/re-register` | Dev mode: re-link chip to wallet |
| `/expense/add` | Create new expense split |
| `/settle` | Quick one-tap payment |
| `/settle/[requestId]` | Pay via shared link |
| `/multi-settle` | Collect from multiple payers |
| `/approve` | Approve tokens for gasless payments |
| `/credits` | Buy credits with USDC |
| `/activities` | Browse available activities |
| `/activity/[activityId]` | Spend credits at activity |

## Adding a New Contract

1. **Contract file** (`packages/foundry/contracts/{ContractName}.sol`)

2. **Deploy script** (`packages/foundry/script/Deploy{ContractName}.s.sol`):
   ```solidity
   ContractName c = new ContractName();
   deployments.push(Deployment({ name: "ContractName", addr: address(c) }));
   ```

3. **Test file** (`packages/foundry/test/{ContractName}.t.sol`)

4. **Yarn shortcuts** (add to both `packages/foundry/package.json` and root `package.json`):
   ```json
   "test:{name}": "forge test --match-contract {ContractName}Test -vvv"
   "deploy:{name}:local": "node scripts-js/parseArgs.js --file Deploy{ContractName}.s.sol --network localhost"
   "deploy:{name}:base": "node scripts-js/parseArgs.js --file Deploy{ContractName}.s.sol --network baseSepolia"
   ```

## Formatting

- Solidity: 120 char lines, 4-space tabs, double quotes (see `foundry.toml`)
- TypeScript: Prettier config in `packages/nextjs/.prettierrc.js`
- Path alias: `~~/*` resolves to `packages/nextjs/`

## Database

Uses Supabase for persistence:
- User profiles and wallet mappings
- Expenses and splits
- Settlement history

Connection configured via environment variables (`@supabase/supabase-js` in root `package.json`).

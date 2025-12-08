# SplitHub

Tap-to-pay bill splitting app on blockchain. NFC Arx Halo Chips sign EIP-712 messages; relayer pays gas fees.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Wagmi/Viem, Privy (Twitter OAuth), TailwindCSS + DaisyUI
- **NFC:** @arx-research/libhalo for Halo Chip signing
- **Contracts:** Foundry, Solidity 0.8.19, Base Sepolia (Chain ID: 84532)
- **Database:** Supabase (PostgreSQL)
- **State:** Zustand

## Project Structure

```
packages/nextjs/           # Frontend
  app/api/relay/           # Gasless transaction endpoints
  app/api/onboarding/      # Onboarding finalization
  services/                # Business logic (balanceService, expenseService, etc.)
  hooks/                   # React hooks (useHaloChip, etc.)
packages/foundry/          # Smart contracts
  contracts/               # Solidity source
```

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| SplitHubRegistry | Links NFC chips to wallet addresses |
| SplitHubPayments | Executes gasless token transfers |
| CreditToken | ERC-20 credits (1 USDC = 10 credits) |
| MockUSDC | Test USDC (6 decimals) |

## Database Schema

**users**
- `wallet_address` (PK), `chip_address` (UNIQUE, nullable)
- `chip_registration_status`: pending | registered | skipped | null
- `approval_status`: pending | completed | null
- `privy_user_id`, `twitter_handle`, `twitter_profile_url`

**expense** - Bill to split
- `creator_wallet` (FK), `description`, `total_amount`, `token_address`, `status`

**expense_participants** - Who owes what
- `expense_id`, `wallet_address`, `share_amount`, `is_creator`

**settlements** - On-chain payment records
- `payer_wallet`, `payee_wallet`, `amount`, `tx_hash`, `status`

**payment_requests** - Shareable payment links
- `id` (UUID), `payer`, `recipient`, `amount`, `memo`, `status`, `expires_at`

**circles / circle_members** - Friend groups for auto-splitting

## Key Routes

| Route | Purpose |
|-------|---------|
| `/register` | NFC chip registration (can skip) |
| `/approve` | ERC-20 token approvals |
| `/splits` | Friend balances dashboard |
| `/settle` | Quick payment page |
| `/settle/[id]` | Payment request link |
| `/expense/add` | Create expense split |
| `/credits` | Buy credits |
| `/activity/[id]` | Spend credits |

## API Endpoints

### Relayer (Gasless)
- `POST /api/relay/register` - Register chip → `{ signer, owner, signature }`
- `POST /api/relay/payment` - Execute payment → `{ auth: PaymentAuth, signature }`
- `POST /api/relay/batch-payment` - Multi-payment
- `POST /api/relay/credit-purchase` - Buy credits
- `POST /api/relay/credit-spend` - Spend credits

### Onboarding
- `POST /api/onboarding/finalize` - Atomic onboarding completion
  - Request: `{ userId, action: 'skip' | 'register', chipAddress? }`
  - Response: `{ nextRoute: '/approve' | '/splits', status: 'ok' }`

## Core Flows

### 1. Onboarding
1. Twitter login via Privy → embedded wallet created
2. `UserSyncWrapper` syncs user to database
3. Chip registration (or skip) → calls `/api/onboarding/finalize`
4. Redirects to `/approve` or `/splits`

### 2. Payments
1. Build EIP-712 PaymentAuth: `{ payer, recipient, token, amount, nonce, deadline }`
2. User taps NFC chip → signs typed data
3. POST to `/api/relay/payment` with auth + signature
4. Relayer calls `SplitHubPayments.executePayment()`
5. Contract verifies: deadline, nonce, signature, chip ownership
6. Transfers tokens via `safeTransferFrom`

### 3. Balance Calculation (`balanceService.ts`)
- Expenses where user is creator → friends owe user
- Expenses where user is participant → user owes creator
- Subtract completed settlements
- Positive = friend owes you, negative = you owe friend

## EIP-712 Structures

```typescript
// PaymentAuth
{ payer, recipient, token, amount, nonce, deadline }

// CreditPurchase
{ buyer, usdcAmount, nonce, deadline }

// CreditSpend
{ spender, amount, activityId, nonce, deadline }
```

## Security Model

- **Nonce:** Prevents replay attacks, must match contract state
- **Deadline:** Signatures expire (typically 1 hour)
- **Registry:** Contract verifies `registry.ownerOf(chipAddress) == payer`
- **Relayer:** Cannot modify signed data (signature becomes invalid)

## Frontend Patterns

- **Minimal `loading.tsx`:** Prevents flash; pages handle granular loading states
- **`skipLoadingStates`:** SessionStorage flag prevents redundant loaders during onboarding
- **`UserSyncWrapper`:** Single source of truth for onboarding routing
- **Dynamic imports:** Code-splitting for NFC/Wagmi components

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RELAYER_PRIVATE_KEY=           # Server-side only

# Optional
NEXT_PUBLIC_ALCHEMY_API_KEY=
```

## Commands

```bash
yarn chain          # Local Anvil
yarn deploy         # Deploy to localhost
yarn deploy:base    # Deploy to Base Sepolia
yarn start          # Start frontend
```

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `InvalidNonce` | Stale nonce | Refetch from contract |
| `ExpiredSignature` | Deadline passed | Generate new signature |
| `UnauthorizedSigner` | Chip not registered | Register chip first |
| `insufficient allowance` | No approval | Navigate to `/approve` |

## Push Notifications

OneSignal Web Push SDK v16 with self-healing subscription system.

**Key Files:**
- `public/OneSignalSDKWorker.js` - Service worker with custom click handler
- `components/OneSignalProvider.tsx` - SDK init & in-app click handling
- `hooks/useNotificationStatus.ts` - Subscription state & atomic resubscription
- `services/notificationService.ts` - Server-side notification dispatch

**Click Handling:**
- Service worker handles clicks when app is closed → opens `/settle/{requestId}`
- In-app handler handles clicks when app is open → navigates via `window.location`
- Both check `data.url`, `additionalData.url`, and fallback to constructing from `requestId`

**Notification Types:**
- `payment_request` → redirects to `/settle/{requestId}`
- `payment_completed` / `expense_created` → redirects to `/splits`

**Env Variables:**
```bash
NEXT_PUBLIC_ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=          # Server-side only
```

## Key Files

- `packages/nextjs/app/api/relay/payment/route.ts` - Payment relayer
- `packages/nextjs/services/balanceService.ts` - Balance calculation
- `packages/nextjs/hooks/useHaloChip.ts` - NFC signing
- `packages/nextjs/hooks/useNotificationStatus.ts` - Notification subscription
- `packages/nextjs/components/UserSyncWrapper.tsx` - Onboarding logic
- `packages/foundry/contracts/SplitHubPayments.sol` - Payment contract

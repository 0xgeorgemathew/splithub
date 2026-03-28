# SplitHub

Tap-to-pay bill splitting on blockchain. NFC Halo Chips sign EIP-712 messages; relayer pays gas.

## Stack

- **Frontend:** Next.js 15, React 19, Wagmi/Viem, Privy (Twitter OAuth), TailwindCSS + DaisyUI
- **NFC:** @arx-research/libhalo
- **Contracts:** Foundry, Solidity 0.8.19, Base Sepolia (84532)
- **Database:** Supabase (PostgreSQL)
- **State:** Zustand

## Structure

```
packages/nextjs/
  app/api/relay/       # Gasless transaction endpoints
  services/            # balanceService, expenseService, etc.
  hooks/               # useHaloChip, etc.
packages/foundry/
  contracts/           # SplitHubRegistry, SplitHubPayments, CreditToken
```

## Contracts

- **SplitHubRegistry** - Links NFC chips to wallets
- **SplitHubPayments** - Gasless token transfers via EIP-712
- **CreditToken** - ERC-20 credits (1 USDC = 10 credits)

## Database Tables

**users**
- `wallet_address` (PK), `chip_address` (UNIQUE), `name`, `email`
- `chip_registration_status`: pending | registered | skipped | null
- `approval_status`: pending | completed | null
- `privy_user_id`, `twitter_handle`, `twitter_profile_url`, `twitter_user_id`

**expense**
- `id` (PK), `creator_wallet` (FK), `description`, `total_amount`, `token_address`
- `status`: active | settled | cancelled

**expense_participants**
- `expense_id` (FK), `wallet_address` (FK), `share_amount`, `is_creator`
- UNIQUE(expense_id, wallet_address)

**settlements**
- `payer_wallet` (FK), `payee_wallet` (FK), `amount`, `token_address`, `tx_hash`
- `status`: pending | completed | failed

**payment_requests**
- `id` (UUID PK), `payer` (FK), `recipient` (FK), `token`, `amount`, `memo`
- `status`: pending | completed | expired
- `expires_at`, `tx_hash`, `requester_twitter`, `payer_twitter`

**circles**
- `id` (UUID PK), `name`, `creator_wallet` (FK), `is_active`

**circle_members**
- `circle_id` (FK), `member_wallet` (FK)
- UNIQUE(circle_id, member_wallet)

## Core Flows

### Payment Flow
1. Build EIP-712 `PaymentAuth`: `{ payer, recipient, token, amount, nonce, deadline }`
2. User taps NFC chip → signs typed data
3. POST `/api/relay/payment` with auth + signature
4. Contract verifies deadline, nonce, signature, chip ownership
5. Executes `safeTransferFrom`

### Balance Calculation (balanceService.ts)
- Expenses where user is creator → friends owe user
- Expenses where user is participant → user owes creator
- Subtract completed settlements
- Positive = owed to you, negative = you owe

### Onboarding
1. Twitter login → Privy creates embedded wallet
2. `UserSyncWrapper` syncs to database
3. Chip registration (or skip) → `/api/onboarding/finalize`
4. Redirects to `/approve` or `/splits`

## Security

- **Nonce** - Prevents replay; must match contract state
- **Deadline** - Signatures expire (~1 hour)
- **Registry** - Contract verifies `registry.ownerOf(chipAddress) == payer`

## Key Files

- `app/api/relay/payment/route.ts` - Payment relayer
- `services/balanceService.ts` - Balance calculation
- `hooks/halochip-arx/useHaloChip.ts` - NFC signing
- `components/UserSyncWrapper.tsx` - Onboarding logic
- `foundry/contracts/SplitHubPayments.sol` - Payment contract

## Commands

```bash
yarn chain          # Local Anvil
yarn deploy         # Deploy localhost
yarn deploy:base    # Deploy Base Sepolia
yarn start          # Start frontend
```

## Common Errors

| Error | Fix |
|-------|-----|
| `InvalidNonce` | Refetch nonce from contract |
| `ExpiredSignature` | Generate new signature |
| `UnauthorizedSigner` | Register chip first |
| `insufficient allowance` | Navigate to `/approve` |

## Routes

- `/register` - Chip registration
- `/approve` - ERC-20 approvals
- `/splits` - Balances dashboard
- `/settle` - Quick payment
- `/expense/add` - Create expense

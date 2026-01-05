# SplitHub - Agent Guidelines

Tap-to-pay bill splitting on blockchain. NFC Halo Chips sign EIP-712 messages; relayer pays gas.

## Stack
- Frontend: Next.js 15, React 19, Wagmi/Viem, Privy (Twitter OAuth), TailwindCSS + DaisyUI
- NFC: @arx-research/libhalo
- Contracts: Foundry, Solidity 0.8.19, Base Sepolia (84532)
- Database: Supabase (PostgreSQL)
- State: Zustand

## Commands

### Development
```bash
yarn chain                    # Start local Anvil blockchain
yarn start                    # Start Next.js dev server (http://localhost:3000)
yarn deploy                   # Deploy contracts to localhost
yarn deploy:base              # Deploy to Base Sepolia
yarn format                   # Format all code (Prettier + forge fmt)
```

### Testing
```bash
yarn test                     # Run all Foundry tests
yarn test:registry            # Run SplitHubRegistryTest
yarn test:payments            # Run SplitHubPaymentsTest
forge test --match-contract ContractNameTest -vvv    # Run single test file
forge test --match-test testFunctionName -vvv         # Run single test function
```

### Linting/Type Checking
```bash
yarn lint                     # Lint all code (Next.js + Foundry)
yarn next:lint                # Lint Next.js only
yarn next:check-types         # TypeScript type checking
```

## Code Style

### TypeScript/React
- **Imports**: React → Next.js → third-party → @heroicons → @~~/ (auto-sorted via @trivago/prettier-plugin-sort-imports)
- **Formatting**: Print width 120, tab width 2, trailing comma all
- **Components**: Functional components with hooks, explicit "use client" directive when needed
- **TypeScript**: Use types from viem (`0x${string}`, Address, etc.). Unused vars prefixed with `_` are ignored
- **State**: Zustand for global state, React hooks for local state
- **Naming**:
  - Components: PascalCase (`VenueCard.tsx`)
  - Services/functions: camelCase (`getFriendBalances`)
  - Interfaces: PascalCase with Props suffix (`VenueCardProps`)

### Contract Interaction (Scaffold-ETH 2)
**Reading contracts:**
```typescript
const { data } = useScaffoldReadContract({
  contractName: "SplitHubPayments",
  functionName: "getNonce",
  args: [walletAddress],
});
```

**Writing contracts:**
```typescript
const { writeContractAsync } = useScaffoldWriteContract({ contractName: "SplitHubPayments" });
await writeContractAsync({ functionName: "executePayment", args: [auth, signature] });
```

**Display components:**
- Use `Address`, `AddressInput`, `Balance`, `EtherInput` from @scaffold-ui/components

### Solidity
- **Version**: ^0.8.19
- **Formatting**: Line length 120, tab width 4, double quotes, bracket spacing true
- **Naming**:
  - Contracts: PascalCase (`SplitHubPayments`)
  - Functions: camelCase (`executePayment`)
  - Constants: UPPER_SNAKE_CASE (`PAYMENT_AUTH_TYPEHASH`)
  - Events: PascalCase (`PaymentExecuted`)
  - Errors: PascalCase (`UnauthorizedSigner`)
- **NatSpec**: Use /// @notice, /// @dev, /// @param, /// @return comments
- **Gas**: Use `immutable` and `calldata` where possible
- **EIP-712**: Structs must match typed data signature exactly

### Error Handling
- **API routes**: Validate inputs early, return 400 for bad requests, 500 for errors. Catch specific contract errors and return user-friendly messages (e.g., "InvalidNonce" → "Transaction out of order")
- **Services**: Throw descriptive errors with context: `throw new Error(\`Failed to fetch: ${error.message}\`)`
- **Components**: Handle loading/error states gracefully

### Database (Supabase)
- **Queries**: Use `.select()`, `.eq()`, `.in()`, `.or()` for filtering
- **Addresses**: Always normalize to lowercase for consistency
- **Joins**: Use `!inner()` for required joins, nested selects for relations

### Testing (Foundry)
- **Structure**: Use `setUp()` for test initialization
- **Naming**: `test_Functionality()` for positive cases, `test_RevertErrorName()` for negative cases
- **Logging**: Use `console.log()` for debugging, `vm.expectRevert()` for revert checks
- **Assertions**: Use `assertEq()`, `assertGt()`, etc. from forge-std

### Hooks
- **Custom hooks**: Prefix with `use` and store in `hooks/` by feature (e.g., `hooks/credits/`)
- **Realtime**: Use `useQuery` with `enabled` option for conditional queries
- **Privy**: `usePrivy()` for wallet operations

### Services
- **Naming**: CamelCase, domain-focused (`balanceService.ts`, `expenseService.ts`)
- **Export**: Named exports only (`export async function getFriendBalances()`)
- **Comments**: JSDoc-style comments for complex algorithms

## Core Flows

### Payment Flow
1. Build EIP-712 `PaymentAuth`: `{ payer, recipient, token, amount, nonce, deadline }`
2. User taps NFC chip → signs typed data via `hooks/halochip-arx/useHaloChip.ts`
3. POST `/api/relay/payment` with auth + signature
4. Contract verifies deadline, nonce, signature, chip ownership via registry
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

## Common Contract Errors
| Error | Fix |
|-------|-----|
| `InvalidNonce` | Refetch nonce from contract |
| `ExpiredSignature` | Generate new signature |
| `UnauthorizedSigner` | Register chip in registry first |
| `insufficient allowance` | Navigate to `/approve` and approve spending |

## Key Files
- `contracts/deployedContracts.ts` - Contract addresses and ABIs
- `scaffold.config.ts` - Frontend configuration
- `app/api/relay/payment/route.ts` - Gasless payment relayer
- `services/balanceService.ts` - Balance calculation logic
- `hooks/halochip-arx/useHaloChip.ts` - NFC signing
- `components/UserSyncWrapper.tsx` - Onboarding logic
- `foundry/contracts/SplitHubPayments.sol` - Payment contract

## Routes
- `/register` - Chip registration
- `/approve` - ERC-20 approvals
- `/splits` - Balances dashboard
- `/settle` - Quick payment
- `/expense/add` - Create expense

## Database Tables
- `users` - Wallet addresses, chip addresses, Twitter OAuth
- `expense` - Expense records with creator, amount, status
- `expense_participants` - Split amounts per participant
- `settlements` - Completed payment settlements
- `payment_requests` - Payment request tracking
- `circles` - Groups for auto-splitting
- `circle_members` - Circle membership

## Pre-commit
Husky runs `lint-staged` on commit:
- Next.js files: lint + type check
- No auto-formatting on commit - run `yarn format` manually

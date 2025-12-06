# SplitHub System Documentation

## High-Level Overview

SplitHub is a tap-to-pay bill splitting and payment application built on blockchain technology. It eliminates the friction of crypto payments by using NFC-enabled Arx Halo Chips as secure hardware wallets that sign transactions with a simple tap—no seed phrases, no wallet popups, no gas fees paid by users.

**Core Value Proposition:**
- **Friends/Social:** Track who owes what, settle debts instantly with one NFC tap
- **Venues/Activities:** Prepaid credit system for events, arcades, festivals—buy credits with USDC, spend at activities

**Key Innovation:** Gasless transactions via a relayer that pays gas fees. Users tap their NFC chip to sign EIP-712 messages authorizing payments. The relayer submits these signed messages on-chain, but cannot modify them (signature integrity).

---

## Architecture & Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER                             │
│  Next.js 15 App Router • Wagmi/Viem • Privy Auth • React 19        │
│                                                                     │
│  Pages:                                                             │
│  • /              Landing page                                      │
│  • /register      NFC chip registration (onboarding)                │
│  • /splits        Friend balances dashboard                         │
│  • /settle        Quick payment page                                │
│  • /credits       Buy/view credits (POS terminal UI)                │
│  • /activities    Browse & spend credits at activities              │
│  • /expense/add   Create new expense split                          │
│  • /approve       ERC-20 token approval setup                       │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     NFC HARDWARE LAYER                              │
│  Arx Halo Chip (Secure Element with Private Key)                   │
│  • Signs EIP-712 typed data on tap                                  │
│  • Private key never leaves chip                                    │
│  • Uses @arx-research/libhalo library                               │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      RELAYER API LAYER                              │
│  Next.js API Routes (packages/nextjs/app/api/)                     │
│                                                                     │
│  /api/relay/register          Gasless chip registration             │
│  /api/relay/payment           Single payment execution              │
│  /api/relay/batch-payment     Multi-recipient payments              │
│  /api/relay/credit-purchase   Buy credits with USDC                 │
│  /api/relay/credit-spend      Spend credits at activities           │
│  /api/payment-requests/*      Payment request CRUD                  │
│  /api/balances/token          Token balance queries                 │
│  /api/settlements             Settlement tracking                   │
│  /api/user                    User profile operations               │
│  /api/circles                 Circle management                     │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN LAYER (Base Sepolia)                  │
│                                                                     │
│  Smart Contracts:                                                   │
│  • SplitHubRegistry     Links NFC chips to wallet addresses         │
│  • SplitHubPayments     Executes gasless token transfers            │
│  • CreditToken          ERC-20 credits (buy with USDC, burn to use) │
│  • MockUSDC             Test USDC token (6 decimals)                │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER (Supabase)                       │
│                                                                     │
│  Tables:                                                            │
│  • users                 User profiles, wallet/chip mappings        │
│  • expense               Expense records to split                   │
│  • expense_participants  Junction table: who owes what              │
│  • settlements           On-chain payment history                   │
│  • payment_requests      Shareable payment links                    │
│  • circles               Friend groups for auto-splitting           │
│  • circle_members        Circle membership                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**Frontend (`packages/nextjs/`)**
- Framework: Next.js 15 with App Router
- Wallet: Wagmi 2.x + Viem for contract interactions
- Auth: Privy for Twitter OAuth login (embedded wallets)
- NFC: @arx-research/libhalo for Halo Chip signing
- UI: TailwindCSS + DaisyUI + Framer Motion
- State: Zustand for client-side store
- Loading Strategy: Minimal `loading.tsx` files prevent flash, pages handle granular states
- Session Storage: `skipLoadingStates` flag prevents redundant loaders during onboarding flow

**Smart Contracts (`packages/foundry/contracts/`)**
- Development: Foundry (Forge, Anvil)
- Language: Solidity 0.8.19
- Standards: EIP-712 signatures, ERC-20 tokens, OpenZeppelin libraries

**Backend Services**
- Relayer: Next.js API routes with server-side wallet (pays gas)
- Database: Supabase (PostgreSQL) for user data, expenses, balances
- RPC: Base Sepolia via default RPC endpoint

**Key Configuration**
- Target network: Base Sepolia (Chain ID: 84532)
- Contract addresses: Auto-generated in `deployedContracts.ts`
- Relayer private key: `RELAYER_PRIVATE_KEY` env variable

### Frontend Architecture Patterns

**Loading State Management:**
- **Minimal `loading.tsx` files**: Next.js App Router `loading.tsx` files are kept minimal (just background color) to prevent flashing loading states during navigation
- **Page-level loading states**: Individual pages (`/register`, `/approve`) handle their own granular loading states based on context (Privy ready, wallet ready, etc.)
- **Reusable loading components**: Extracted `LoadingUI` and `LoadingCard` components eliminate code duplication
- **Session storage flags**: `skipLoadingStates` flag in sessionStorage prevents redundant loading screens during onboarding flow transitions

**Code Organization Best Practices:**
- **DRY principle**: Loading UI components extracted and reused across multiple states
- **Single responsibility**: `UserSyncWrapper` handles all onboarding routing logic (single source of truth)
- **Separation of concerns**: Auth redirects, loading states, and business logic clearly separated
- **Component composition**: Dynamic imports for code-splitting heavy components (NFC, Wagmi)

**Onboarding Flow Architecture:**
- **Atomic finalization**: `/api/onboarding/finalize` endpoint consolidates all onboarding checks in single API call
- **Prevents race conditions**: `isFinalizingRef` flag prevents duplicate finalize calls
- **Smooth UX**: `OnboardingFinalizer` full-screen loader with minimum display time (1.2s) prevents jarring fast transitions
- **Skip loading on redirect**: After finalize, destination page skips loading states for seamless transition

**Error Handling:**
- **Approval flow**: Handles transaction rejection, network errors, and insufficient balance with clear user feedback
- **Database updates**: Marks `approval_status = 'completed'` after successful approvals
- **Retry logic**: Failed approvals reset state to allow user retry without page refresh

---

## Core Concepts & Data Model

### Domain Entities

**User**
- `wallet_address` (PK): Ethereum address of user's wallet
- `chip_address` (UNIQUE): NFC chip address (registered during onboarding, or null if skipped/not yet registered)
- `chip_registration_status`: pending | registered | skipped | null - Tracks chip registration state
- `approval_status`: pending | completed | null - Tracks token approval completion (set when both USDC approvals complete)
- `name`: Display name
- `email`: Email (optional, not used with Twitter login)
- `privy_user_id` (UNIQUE): Privy authentication ID
- `twitter_handle`: Twitter username (without @)
- `twitter_profile_url`: Twitter profile picture
- `twitter_user_id`: Twitter OAuth user ID

**Expense**
- `id` (PK): Auto-increment ID
- `creator_wallet` (FK → users): Who created/paid for the expense
- `description`: What the expense is for
- `total_amount`: Total amount in token units (e.g., USDC)
- `token_address`: ERC-20 token contract address
- `status`: active | settled | cancelled

**Expense Participant** (junction table)
- `expense_id` (FK → expense)
- `wallet_address` (FK → users)
- `share_amount`: How much this participant owes/is owed
- `is_creator`: Boolean indicating if this is the expense creator

**Settlement** (on-chain payment record)
- `payer_wallet` (FK → users): Who paid
- `payee_wallet` (FK → users): Who received
- `amount`: Payment amount
- `token_address`: Token used
- `tx_hash`: Blockchain transaction hash
- `status`: pending | completed | failed
- `completed_at`: Timestamp of completion

**Payment Request** (shareable payment link)
- `id` (UUID, PK): Used in URL `/settle/{id}`
- `payer` (FK → users): Who should pay
- `recipient` (FK → users): Who receives payment
- `token`: Token address
- `amount`: Amount to pay (stored as string)
- `memo`: Optional description
- `status`: pending | completed | expired
- `expires_at`: Expiration timestamp (typically 24 hours)
- `requester_twitter`, `payer_twitter`: Twitter handles for display

**Circle** (friend groups for auto-splitting)
- `id` (UUID, PK)
- `name`: Display name (e.g., "Roommates")
- `creator_wallet` (FK → users): Who created the circle
- `is_active`: Boolean (only one active circle per user at a time)

**Circle Member** (junction table)
- `circle_id` (FK → circles)
- `member_wallet` (FK → users)
- UNIQUE constraint on (circle_id, member_wallet)

### Relationships

```
users (1) ←─────────── (N) expense (creator)
users (1) ←─────────── (N) expense_participants
expense (1) ←─────────── (N) expense_participants

users (1) ←─────────── (N) settlements (as payer)
users (1) ←─────────── (N) settlements (as payee)

users (1) ←─────────── (N) payment_requests (as payer)
users (1) ←─────────── (N) payment_requests (as recipient)

users (1) ←─────────── (N) circles (as creator)
circles (1) ←─────────── (N) circle_members
users (1) ←─────────── (N) circle_members
```

### Balance Calculation Logic

The system computes net balances between friends by aggregating expenses and settlements:

```typescript
// For user Alice viewing her balances:
// 1. Expenses where Alice is creator → friends owe Alice their share
// 2. Expenses where Alice is participant → Alice owes creator her share
// 3. Completed settlements adjust the balances
// Net balance = (what friends owe) - (what Alice owes) - (settled payments)

// Positive balance = friend owes you
// Negative balance = you owe friend
```

Algorithm (from `balanceService.ts`):
1. Fetch all expenses where user is creator (others owe user)
2. Fetch all expenses where user is participant (user owes creator)
3. Fetch all completed settlements involving user
4. Aggregate by friend wallet:
   - Add amounts where friends owe user
   - Subtract amounts where user owes friends
   - Adjust for settlements (payments reduce debt)
5. Filter out balances < $0.01 (considered settled)

---

## Process Flows (Step-by-Step)

### 1. User Onboarding / Registration Flow

**Route:** `/register`

**Preconditions:**
- User has Twitter account
- User has Arx Halo Chip (optional - can be skipped)

**Steps:**

1. **Twitter Login**
   - User clicks "Login with Twitter" on landing page
   - Privy OAuth flow redirects to Twitter
   - User authorizes SplitHub app
   - Privy creates embedded wallet for user

2. **Database Sync**
   - `UserSyncWrapper` component calls `syncPrivyUser()`
   - Service checks if user exists by `privy_user_id`
   - If new: Creates user record with Twitter data, wallet address
   - If existing: Updates Twitter profile info

3. **NFC Chip Registration** (`RegisterChipForm` component)

   **Option A: Register Chip (Full Flow)**
   - User taps NFC chip to read chip address
   - System builds EIP-712 typed data:
     ```typescript
     domain: { name: "SplitHubRegistry", version: "1", chainId, verifyingContract }
     types: { ChipRegistration: [{ name: "owner", type: "address" }, { name: "chipAddress", type: "address" }] }
     message: { owner: userWallet, chipAddress: chipAddress }
     ```
   - User taps chip again to sign
   - Chip returns signature using private key stored on secure element
   - Frontend sends `{ signer: chipAddress, owner: userWallet, signature }` to `/api/relay/register`
   - Relayer creates transaction calling `SplitHubRegistry.register(signer, owner, signature)`
   - Relayer pays gas and submits on-chain
   - Contract verifies signature matches chip address
   - Contract stores mapping: `ownerOf[chip] = wallet` and `signerOf[wallet] = chip`
   - **Finalize Onboarding**: Frontend displays `OnboardingFinalizer` full-screen loader ("Checking your account…")
   - Frontend calls `/api/onboarding/finalize` with `{ userId, action: 'register', chipAddress }`
   - Backend updates `chip_address` and `chip_registration_status = 'registered'`
   - Backend checks `approval_status` and returns appropriate next route
   - Sets `skipLoadingStates` flag in sessionStorage to prevent loading flash on destination page
   - User redirected to returned route (`/approve` or `/splits`)

   **Option B: Skip Chip Registration (Alternative Path)**
   - User clicks "Skip and continue" button
   - **Finalize Onboarding**: Frontend displays `OnboardingFinalizer` full-screen loader ("Checking your account…")
   - Frontend calls `/api/onboarding/finalize` with `{ userId, action: 'skip' }`
   - Backend updates `chip_registration_status = 'skipped'`
   - Backend checks `approval_status` and returns appropriate next route
   - Sets `skipLoadingStates` flag in sessionStorage to prevent loading flash on destination page
   - User redirected to returned route (`/approve` or `/splits`)
   - User can register chip later from settings

**Key Onboarding Endpoint:**

`POST /api/onboarding/finalize` - Atomic endpoint that consolidates all onboarding checks and database updates. Prevents flashing screens by returning the next route in a single call.

Request:
```json
{
  "userId": "privy_user_id",
  "action": "skip" | "register",
  "chipAddress": "0x..." // Required for 'register', optional for 'skip'
}
```

Response:
```json
{
  "nextRoute": "/approve" | "/splits",
  "status": "ok"
}
```

**Success State (Option A - Full Registration):**
- User has Twitter account linked
- Embedded wallet created and funded
- NFC chip registered on-chain
- Database record complete with chip_address and chip_registration_status = 'registered'

**Success State (Option B - Skipped Registration):**
- User has Twitter account linked
- Embedded wallet created and funded
- chip_address remains null
- chip_registration_status = 'skipped'
- User can complete chip registration later from settings

---

### 2. Token Approval Flow

**Route:** `/approve`

**Purpose:** One-time setup to allow smart contracts to spend user's tokens

**Preconditions:**
- User has completed registration (either registered chip or skipped)
- User has USDC tokens in wallet

**Steps:**

1. **User Navigates to Approve Page**
   - If coming from onboarding, loading states are skipped (`skipLoadingStates` flag)
   - Displays list of tokens/contracts needing approval:
     - USDC → SplitHubPayments contract
     - USDC → CreditToken contract

2. **Approval Execution**
   - User clicks "Approve" for each token/contract pair
   - Wallet prompts signature for ERC-20 `approve(spender, amount)` call
   - User signs with wallet (not NFC chip—this is wallet signature)
   - Transaction submitted on-chain

3. **Verification & Error Handling**
   - Frontend polls allowance: `USDC.allowance(userWallet, contractAddress)`
   - Once allowance > 0, approval marked as complete
   - UI shows green checkmark
   - Error handling:
     - User rejection: Shows "Transaction rejected. Please try again when ready."
     - Network error: Shows error message, allows retry
     - Transaction revert: Parses revert reason and displays

4. **Database Update**
   - After both approvals complete successfully, updates `users.approval_status = 'completed'`
   - Auto-redirects to `/splits` after brief success display (600ms)

**Success State:**
- SplitHubPayments can transfer USDC from user's wallet (for bill splitting)
- CreditToken can transfer USDC from user's wallet (for buying credits)
- User's `approval_status` marked as 'completed' in database

---

### 3. Creating an Expense Split

**Route:** `/expense/add`

**Use Case:** Alice pays $60 for dinner with 3 friends. She wants to split it equally.

**Steps:**

1. **Create Expense Form**
   - Alice enters:
     - Description: "Dinner at Sushi Place"
     - Total amount: 60 USDC
     - Participants: Alice, Bob, Carol, David (4 people)
   - UI shows split: 60 / 4 = 15 USDC per person

2. **Submit Expense** (`expenseService.createExpense()`)
   - Frontend calls `/api/expense` or directly uses service
   - Service normalizes all wallet addresses to lowercase
   - Validates: creator in participants, amount > 0
   - Ensures all participant users exist in DB (creates placeholder if needed)

3. **Database Inserts** (wrapped in transaction-like logic)
   ```sql
   -- Insert expense record
   INSERT INTO expense (creator_wallet, description, total_amount, token_address, status)
   VALUES ('alice_wallet', 'Dinner...', 60, '0xUSDC', 'active');

   -- Insert participants (4 rows)
   INSERT INTO expense_participants (expense_id, wallet_address, share_amount, is_creator)
   VALUES
     (expense_id, 'alice_wallet', 15, true),   -- Alice is creator
     (expense_id, 'bob_wallet', 15, false),
     (expense_id, 'carol_wallet', 15, false),
     (expense_id, 'david_wallet', 15, false);
   ```

4. **Balance Update**
   - Balances recalculated via `getFriendBalances()`
   - Alice's view: Bob owes $15, Carol owes $15, David owes $15
   - Bob's view: Owes Alice $15 (negative balance)

**Success State:**
- Expense created in database
- Each participant's balance updated
- Visible on `/splits` page for all participants

---

### 4. Payment Transaction Lifecycle (Settling a Debt)

**Route:** `/settle` or tap friend card on `/splits`

**Use Case:** Bob owes Alice $15. Bob taps his chip to pay Alice.

#### 4.1 Initiation

**Steps:**

1. **User Initiates Payment**
   - Bob navigates to `/settle` or taps Alice's card on his balances page
   - System determines:
     - `payer`: Bob's wallet
     - `recipient`: Alice's wallet
     - `token`: USDC address
     - `amount`: $15 (in wei: 15 * 10^6 for USDC)

2. **Nonce & Deadline Retrieval**
   - Frontend reads Bob's current nonce from `SplitHubPayments.nonces(bob)`
   - Sets deadline: `now + 1 hour` (signature expires in 1 hour)

3. **EIP-712 Typed Data Construction**
   ```typescript
   domain: {
     name: "SplitHubPayments",
     version: "1",
     chainId: 84532,
     verifyingContract: paymentsContractAddress
   }
   types: {
     PaymentAuth: [
       { name: "payer", type: "address" },
       { name: "recipient", type: "address" },
       { name: "token", type: "address" },
       { name: "amount", type: "uint256" },
       { name: "nonce", type: "uint256" },
       { name: "deadline", type: "uint256" }
     ]
   }
   message: {
     payer: bob,
     recipient: alice,
     token: usdcAddress,
     amount: 15000000n,  // 15 USDC in wei
     nonce: currentNonce,
     deadline: timestamp
   }
   ```

#### 4.2 Broadcast / Execution

**Steps:**

4. **NFC Chip Signing** (`useHaloChip.signTypedData()`)
   - UI prompts: "Tap your chip"
   - User taps NFC chip to phone
   - `execHaloCmdWeb()` sends typed data to chip
   - Chip signs with private key (never leaves chip)
   - Returns: `{ address: chipAddress, signature: "0x..." }`

5. **Relayer Submission**
   - Frontend POSTs to `/api/relay/payment`:
     ```json
     {
       "auth": {
         "payer": "0xBob",
         "recipient": "0xAlice",
         "token": "0xUSDC",
         "amount": "15000000",
         "nonce": "5",
         "deadline": "1733529600"
       },
       "signature": "0x1234..."
     }
     ```

6. **Relayer Processing** (`/api/relay/payment/route.ts`)
   - Validates inputs (addresses, signature format)
   - Creates wallet client with `RELAYER_PRIVATE_KEY`
   - Calls `SplitHubPayments.executePayment(auth, signature)`
   - Relayer pays gas fee

7. **Smart Contract Execution** (`SplitHubPayments.sol`)
   ```solidity
   function executePayment(PaymentAuth calldata auth, bytes calldata signature) external {
     // 1. Check deadline
     require(block.timestamp <= auth.deadline, "ExpiredSignature");

     // 2. Check and increment nonce
     require(auth.nonce == nonces[auth.payer], "InvalidNonce");
     nonces[auth.payer]++;

     // 3. Verify signature
     bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(PAYMENT_AUTH_TYPEHASH, auth...)));
     address signer = digest.recover(signature);

     // 4. Verify chip ownership
     require(registry.ownerOf(signer) == auth.payer, "UnauthorizedSigner");

     // 5. Transfer tokens
     IERC20(auth.token).safeTransferFrom(auth.payer, auth.recipient, auth.amount);

     emit PaymentExecuted(auth.payer, auth.recipient, auth.token, auth.amount, signer, nonce);
   }
   ```

#### 4.3 Confirmation / Finalization

**Steps:**

8. **Transaction Confirmation**
   - Relayer waits for receipt: `publicClient.waitForTransactionReceipt(hash)`
   - Returns to frontend: `{ success: true, txHash, blockNumber }`

9. **Settlement Record** (optional, depends on implementation)
   - System may create settlement record in database:
     ```sql
     INSERT INTO settlements (payer_wallet, payee_wallet, amount, token_address, tx_hash, status)
     VALUES ('bob', 'alice', 15, '0xUSDC', '0xabc...', 'completed');
     ```

10. **Balance Update**
    - Frontend triggers balance refresh: `window.dispatchEvent(new Event('refreshBalances'))`
    - `getFriendBalances()` recalculates balances
    - Bob's debt to Alice reduced/cleared

11. **User Feedback**
    - UI shows success animation
    - Displays transaction hash link to block explorer
    - Nonce refetched for next payment

#### 4.4 Circle Auto-Split (Advanced Feature)

**When Applicable:** If Bob has an active Circle (e.g., "Roommates"), the payment automatically splits with circle members.

**Steps (within relayer):**

12. **Check for Active Circle**
    - After payment success, relayer calls `getActiveCircle(payer)`
    - If found: `{ id, name, creator_wallet, is_active: true }`

13. **Fetch Circle Members**
    - `getCircleMembers(circleId)` returns array of User objects
    - Example: Circle "Roommates" has Bob (creator), Carol, David

14. **Calculate Split**
    - Total participants: 3 (Bob + 2 members)
    - Split amount: $15 / 3 = $5 per person
    - Bob paid $15, so Carol and David each owe Bob $5

15. **Create Expense**
    - `createExpense({ creator: bob, description: "Circle: Roommates", totalAmount: 15, participants: [bob, carol, david] })`
    - Each participant gets `share_amount: 5`

16. **Create Payment Requests**
    - For Carol: `INSERT INTO payment_requests (payer: carol, recipient: bob, amount: "5.00", memo: "Circle split: Roommates", expires_at: now + 24h)`
    - For David: Same but payer is David
    - These appear on Carol and David's `/requests` page

17. **Return to Frontend**
    - Response includes: `{ success: true, txHash, circleSplit: { circleName, membersNotified, splitAmount } }`

**Success State:**
- Payment executed on-chain
- Transaction hash recorded
- Balances updated
- If Circle active: Expense auto-created, payment requests sent to members

---

### 5. Buying Credits (Closed-Loop Stored Value)

**Route:** `/credits`

**Use Case:** Alice wants to buy credits to use at venue activities.

**Conversion Rate:** 1 USDC = 10 Credits

**Steps:**

1. **User Enters Amount**
   - Alice enters: 10 USDC
   - UI shows: "You will receive 100 credits"

2. **Nonce & Deadline**
   - Frontend reads nonce from `CreditToken.nonces(alice)`
   - Sets deadline: now + 1 hour

3. **EIP-712 Typed Data**
   ```typescript
   domain: { name: "CreditToken", version: "1", chainId, verifyingContract: creditTokenAddress }
   types: {
     CreditPurchase: [
       { name: "buyer", type: "address" },
       { name: "usdcAmount", type: "uint256" },
       { name: "nonce", type: "uint256" },
       { name: "deadline", type: "uint256" }
     ]
   }
   message: { buyer: alice, usdcAmount: 10000000n, nonce, deadline }  // 10 USDC = 10,000,000 (6 decimals)
   ```

4. **NFC Signing**
   - User taps chip
   - Chip signs typed data
   - Returns signature

5. **Relayer Submission**
   - POST to `/api/relay/credit-purchase`
   - Body: `{ purchase: { buyer, usdcAmount, nonce, deadline }, signature }`

6. **Smart Contract Execution** (`CreditToken.purchaseCredits()`)
   ```solidity
   function purchaseCredits(CreditPurchase calldata purchase, bytes calldata signature) external {
     // Verify signature, deadline, nonce (same as payments)
     // ...

     // Transfer USDC from buyer to contract
     usdc.safeTransferFrom(purchase.buyer, address(this), purchase.usdcAmount);

     // Mint credits (1 USDC = 10 credits)
     // USDC: 6 decimals, Credits: 18 decimals
     uint256 creditAmount = (purchase.usdcAmount * 10 * 1e18) / 1e6;
     _mint(purchase.buyer, creditAmount);

     emit CreditsPurchased(buyer, usdcAmount, creditAmount, signer);
   }
   ```

7. **Transaction Confirmation**
   - Relayer waits for receipt
   - Returns: `{ success: true, txHash, creditsMinted: "100000000000000000000" }`

8. **UI Update**
   - Frontend displays success
   - Credit balance updates (queries `CreditToken.balanceOf(alice)`)
   - Displays: "100 credits" (formatted from 18-decimal value)

**Success State:**
- Alice's USDC transferred to CreditToken contract
- Alice minted 100 credits (ERC-20 tokens)
- Venue can later withdraw USDC via `withdrawUSDC()`

---

### 6. Spending Credits at Activity

**Route:** `/activity/[activityId]`

**Use Case:** Alice wants to play Laser Tag (costs 50 credits).

**Activities Defined:** `packages/nextjs/config/activities.ts`
- Laser Tag: 50 credits
- Bowling: 30 credits
- Air Hockey: 20 credits

**Steps:**

1. **User Selects Activity**
   - Alice navigates to `/activity/1` (Laser Tag)
   - UI shows: "Laser Tag - 50 credits"
   - Button: "Tap to Spend"

2. **Nonce & Deadline**
   - Read nonce from `CreditToken.nonces(alice)`
   - Deadline: now + 1 hour

3. **EIP-712 Typed Data**
   ```typescript
   domain: { name: "CreditToken", version: "1", ... }
   types: {
     CreditSpend: [
       { name: "spender", type: "address" },
       { name: "amount", type: "uint256" },
       { name: "activityId", type: "uint256" },
       { name: "nonce", type: "uint256" },
       { name: "deadline", type: "uint256" }
     ]
   }
   message: { spender: alice, amount: 50e18, activityId: 1, nonce, deadline }
   ```

4. **NFC Signing**
   - Tap chip → sign → return signature

5. **Relayer Submission**
   - POST `/api/relay/credit-spend`
   - Body: `{ spend: { spender, amount, activityId, nonce, deadline }, signature }`

6. **Smart Contract Execution** (`CreditToken.spendCredits()`)
   ```solidity
   function spendCredits(CreditSpend calldata spend, bytes calldata signature) external {
     // Verify signature, deadline, nonce
     // ...

     // Check balance and burn credits
     require(balanceOf(spend.spender) >= spend.amount, "InsufficientBalance");
     _burn(spend.spender, spend.amount);

     emit CreditsSpent(spender, amount, activityId, signer);
   }
   ```

7. **Activity Access Granted**
   - Transaction confirmed
   - Frontend shows receipt printer animation
   - UI: "Access Granted - Laser Tag"
   - Physical integration point: Venue could listen for `CreditsSpent` event to unlock turnstile

**Success State:**
- 50 credits burned from Alice's balance
- On-chain event emitted with activityId
- Alice granted access to activity

---

### 7. Payment Request Link Flow (Twitter-to-Twitter Payments)

**Route:** `/settle/[requestId]`

**Use Case:** Alice wants Bob to pay her $20 for concert ticket. She sends him a payment link.

#### 7.1 Creating Payment Request

**Steps:**

1. **Alice Creates Request**
   - Route: `/request/create` (not documented in CLAUDE.md but exists)
   - Alice enters:
     - Recipient (herself): selected from friends or by Twitter handle
     - Payer: Bob (by wallet or Twitter)
     - Amount: 20 USDC
     - Memo: "Concert ticket"

2. **Database Insert**
   ```sql
   INSERT INTO payment_requests (
     payer, recipient, token, amount, memo,
     status, expires_at,
     requester_twitter, payer_twitter
   ) VALUES (
     'bob_wallet', 'alice_wallet', '0xUSDC', '20.00', 'Concert ticket',
     'pending', NOW() + INTERVAL '24 hours',
     'alice', 'bob'
   ) RETURNING id;
   ```

3. **Generate Shareable Link**
   - ID returned: `550e8400-e29b-41d4-a716-446655440000`
   - Link: `https://splithub.app/settle/550e8400-e29b-41d4-a716-446655440000`

4. **Alice Shares Link**
   - Copies link to Twitter DM
   - Or displays QR code for in-person payment

#### 7.2 Bob Pays via Link

**Steps:**

5. **Bob Opens Link**
   - Navigates to `/settle/[requestId]`
   - Page queries: `SELECT * FROM payment_requests WHERE id = uuid AND status = 'pending'`
   - Displays:
     - "Alice (@alice) requests $20 USDC"
     - Memo: "Concert ticket"
     - Button: "Tap to Pay"

6. **Payment Execution** (same as flow #4)
   - Bob taps chip
   - Signs payment authorization
   - Relayer submits transaction
   - USDC transferred from Bob to Alice

7. **Update Payment Request**
   ```sql
   UPDATE payment_requests
   SET status = 'completed', tx_hash = '0xabc...', completed_at = NOW()
   WHERE id = uuid;
   ```

8. **Redirect to Success**
   - UI shows success page
   - Link now marked as "Paid" if accessed again

**Success State:**
- Payment completed on-chain
- Payment request marked as completed
- Both users see updated balances

---

## Transaction Lifecycle Summary (Very Clear)

### Payment Transaction (SplitHubPayments)

| Phase | Actor | What Happens | Data/State Changes | Failure Handling |
|-------|-------|--------------|-------------------|------------------|
| **Initiation** | Frontend | 1. User clicks "Pay"<br>2. Read payer's nonce from contract<br>3. Build PaymentAuth struct<br>4. Set deadline (now + 1h) | None (read-only) | If nonce read fails: show error, halt |
| **Signing** | NFC Chip | 1. User taps chip<br>2. Chip signs EIP-712 digest<br>3. Return signature + chip address | None (off-chain signing) | If tap fails: retry prompt<br>If signature invalid: retry |
| **Broadcast** | Relayer API | 1. Receive auth + signature<br>2. Create tx calling `executePayment()`<br>3. Relayer signs with own key<br>4. Submit to RPC | None (pending tx) | If RPC error: return 500 to frontend<br>If out of gas: relayer issue |
| **Verification** | Smart Contract | 1. Check `deadline > now`<br>2. Check `nonce == expected`<br>3. Increment nonce<br>4. Recover signer from signature<br>5. Verify `registry.ownerOf(signer) == payer` | Nonce incremented (prevents replay) | `ExpiredSignature`: reject<br>`InvalidNonce`: reject<br>`UnauthorizedSigner`: reject |
| **Execution** | Smart Contract | 1. Call `IERC20.safeTransferFrom(payer, recipient, amount)` | Tokens transferred<br>Event emitted | `InsufficientBalance`: revert<br>`InsufficientAllowance`: revert |
| **Confirmation** | Relayer API | 1. Wait for receipt<br>2. Check `status == success`<br>3. Return txHash to frontend | None (finalized on-chain) | If tx reverted: return error message to frontend |
| **Finalization** | Frontend | 1. Update UI (success message)<br>2. Refetch balances<br>3. Refetch nonce | Client state updated | None (tx already confirmed) |
| **Optional: Circle Split** | Relayer API | 1. Check if payer has active Circle<br>2. Create expense + payment requests for members | Database: expense, expense_participants, payment_requests created | If fails: log error (non-critical) |

### Credit Purchase Transaction (CreditToken)

| Phase | What Happens | State Changes |
|-------|--------------|---------------|
| Initiation | User enters USDC amount, deadline set | None |
| Signing | NFC chip signs CreditPurchase struct | None |
| Broadcast | Relayer submits `purchaseCredits(purchase, sig)` | Pending tx |
| Verification | Contract checks deadline, nonce, signature | Nonce incremented |
| Execution | 1. Transfer USDC from buyer to contract<br>2. Mint credits (1 USDC = 10 credits, accounting for decimals) | USDC balance: buyer ↓, contract ↑<br>Credit balance: buyer ↑ |
| Confirmation | Relayer returns success + creditsMinted | Finalized |

### Credit Spend Transaction (CreditToken)

| Phase | What Happens | State Changes |
|-------|--------------|---------------|
| Initiation | User selects activity, amount = activity cost | None |
| Signing | NFC chip signs CreditSpend struct (includes activityId) | None |
| Broadcast | Relayer submits `spendCredits(spend, sig)` | Pending tx |
| Verification | Contract checks deadline, nonce, signature | Nonce incremented |
| Execution | 1. Check balance >= amount<br>2. Burn credits | Credit balance: spender ↓ |
| Event Emission | `CreditsSpent(spender, amount, activityId, signer)` | Event on-chain (venue can index) |
| Confirmation | Relayer returns success | Finalized |

### Idempotency & Safety

**Nonce System:**
- Each user has a nonce counter in each contract
- Nonce must match expected value: `require(auth.nonce == nonces[payer])`
- Nonce incremented immediately after check: `nonces[payer]++`
- **Prevents:** Replay attacks (same signature cannot be used twice)
- **Prevents:** Out-of-order execution (nonce must increment sequentially)

**Deadline System:**
- Every signature includes expiration timestamp
- Contract rejects: `require(block.timestamp <= deadline)`
- **Prevents:** Old signatures being used indefinitely
- **Best Practice:** Frontend sets deadline = now + 1 hour

**Signature Verification:**
- EIP-712 ensures signature covers all fields (payer, recipient, amount, etc.)
- If relayer modifies ANY field, signature becomes invalid
- **Prevents:** Relayer stealing funds or redirecting payments
- **Ensures:** What user signed is exactly what executes

**Registry Verification:**
- Contract checks: `registry.ownerOf(chipAddress) == payer`
- **Prevents:** Stolen/cloned chips from authorizing payments
- **Ensures:** Only registered chip owner can authorize payments from their wallet

**Invariants That Must Always Hold:**
- Nonce always increments (never decreases or skips)
- Total credits minted = Total USDC deposited * 10 (exchange rate)
- User cannot spend more credits than balance
- Payment cannot execute without valid chip signature from registered chip
- Token transfers only happen if signature valid AND allowance sufficient

---

## Use Cases & Scenarios

### Scenario 1: Alice Splits Dinner Bill with Friends

**Actors:** Alice (payer), Bob, Carol, David (friends)

**Preconditions:**
- All users registered with chips
- All users approved USDC for SplitHubPayments
- Alice has 100 USDC in wallet

**Flow:**

1. Alice pays $80 for dinner at restaurant (off-chain, with card)
2. Alice opens SplitHub → `/expense/add`
3. Enters:
   - Description: "Sushi dinner"
   - Total: 80 USDC
   - Participants: Alice, Bob, Carol, David (4 people)
4. System calculates split: 80 / 4 = $20 per person
5. Alice submits → expense created in database
6. Bob logs in → sees on `/splits`: "You owe Alice $20"
7. Bob taps Alice's card → payment modal opens
8. Bob taps his NFC chip → signs payment for $20
9. Transaction executes on-chain: Bob's wallet → Alice's wallet (20 USDC)
10. Bob's balance updates: $20 debt cleared
11. Carol and David repeat steps 7-10
12. Alice sees: "All settled" (no outstanding balances)

**Expected Outcomes:**
- Expense record: status = 'active' (or could be marked 'settled' if all paid)
- Settlements: 3 records (Bob→Alice, Carol→Alice, David→Alice)
- Balances: All friends show $0 owed/owing to Alice
- On-chain: 3 transactions, 60 USDC total transferred to Alice

---

### Scenario 2: Venue Onboards and User Spends Credits

**Actors:** Venue Owner (venue), Alice (customer)

**Preconditions:**
- Venue deployed CreditToken contract
- Alice registered with chip
- Alice has 50 USDC in wallet
- Alice approved USDC for CreditToken

**Flow:**

**Part A: Alice Buys Credits**
1. Alice arrives at venue (arcade)
2. Opens `/credits` page
3. Enters: 20 USDC → sees "You will receive 200 credits"
4. Taps "Buy Credits" button
5. Taps NFC chip → signs purchase
6. Relayer executes: 20 USDC transferred, 200 credits minted
7. Alice sees: "Balance: 200 credits"

**Part B: Alice Plays Laser Tag (50 credits)**
8. Alice goes to Laser Tag station
9. Opens `/activity/1` (Laser Tag)
10. UI shows: "Laser Tag - 50 credits" with balance "200 credits"
11. Taps "Spend Credits" button
12. Taps NFC chip → signs spend
13. Relayer executes: 50 credits burned
14. Event emitted: `CreditsSpent(alice, 50, activityId=1)`
15. Venue's system detects event → unlocks Laser Tag equipment
16. Alice plays Laser Tag
17. Alice's balance: 150 credits remaining

**Part C: Alice Plays Bowling (30 credits) and Air Hockey (20 credits)**
18. Repeat steps 9-15 for Bowling (activityId=2)
19. Repeat steps 9-15 for Air Hockey (activityId=3)
20. Alice's final balance: 100 credits

**Part D: Venue Withdraws USDC**
21. Venue owner calls `CreditToken.withdrawUSDC(venueWallet)`
22. 20 USDC transferred to venue's wallet
23. Venue can convert to fiat or use for operations

**Expected Outcomes:**
- Alice spent 100 credits (1 Laser Tag, 1 Bowling, 1 Air Hockey)
- Alice has 100 credits remaining
- Venue collected 20 USDC
- 3 on-chain events emitted (venue can track usage analytics)
- No gas fees paid by Alice

---

### Scenario 3: Circle Auto-Split for Roommates

**Actors:** Alice, Bob, Carol (roommates)

**Preconditions:**
- All registered with chips
- Alice created Circle "Roommates" with members Bob and Carol
- Circle is active (is_active = true)
- All approved USDC for SplitHubPayments

**Flow:**

1. Alice buys groceries for $60 (off-chain)
2. Alice taps her chip to pay a merchant $60
3. **Relayer detects active Circle:**
   - After payment succeeds, relayer calls `getActiveCircle(alice)`
   - Finds: Circle "Roommates" with members Bob, Carol
4. **Auto-split calculation:**
   - Total participants: 3 (Alice + Bob + Carol)
   - Split: $60 / 3 = $20 per person
5. **Relayer creates expense:**
   - `createExpense({ creator: alice, description: "Circle: Roommates", totalAmount: 60, participants: [alice, bob, carol] })`
   - Each participant owes $20
6. **Relayer creates payment requests:**
   - Bob: `payment_request { payer: bob, recipient: alice, amount: 20, memo: "Circle split: Roommates" }`
   - Carol: Same but payer is Carol
7. **Bob and Carol receive notifications:**
   - Navigate to `/requests` → see pending request from Alice
   - Bob clicks request → opens `/settle/[requestId]`
   - Bob taps chip → pays $20 to Alice
   - Carol repeats
8. **Final state:**
   - Alice received $60 total ($20 from Bob, $20 from Carol, $20 net from herself)
   - Expense settled
   - All balances $0

**Expected Outcomes:**
- 1 payment on-chain: Alice → Merchant
- 1 expense created (Circle auto-split)
- 2 payment requests created (Bob and Carol)
- 2 additional payments: Bob → Alice, Carol → Alice
- Total on-chain transactions: 3
- Circle feature automatically tracked who owes what

---

## API & Endpoint Summary

### Relayer Endpoints (Gasless Transactions)

| Endpoint | Method | Purpose | Critical Parameters | Response |
|----------|--------|---------|---------------------|----------|
| `/api/relay/register` | POST | Register NFC chip to wallet | `signer`, `owner`, `signature` | `{ success, txHash, blockNumber }` |
| `/api/relay/payment` | POST | Execute single payment | `auth: PaymentAuth`, `signature` | `{ success, txHash, circleSplit? }` |
| `/api/relay/batch-payment` | POST | Execute multiple payments in one tx | `payments: PaymentAuth[]`, `signatures[]` | `{ success, txHash }` |
| `/api/relay/credit-purchase` | POST | Buy credits with USDC | `purchase: CreditPurchase`, `signature` | `{ success, txHash, creditsMinted }` |
| `/api/relay/credit-spend` | POST | Spend credits at activity | `spend: CreditSpend`, `signature` | `{ success, txHash, activityId }` |

### Important Notes

**PaymentAuth Structure (used in relay/payment):**
```typescript
{
  payer: "0x...",       // Who pays
  recipient: "0x...",   // Who receives
  token: "0x...",       // Token contract address
  amount: "1000000",    // Amount in smallest unit (wei/satoshi equivalent)
  nonce: "5",           // Current nonce for payer
  deadline: "1733529600" // Unix timestamp
}
```

**CreditPurchase Structure:**
```typescript
{
  buyer: "0x...",
  usdcAmount: "10000000",  // 10 USDC (6 decimals)
  nonce: "2",
  deadline: "1733529600"
}
```

**CreditSpend Structure:**
```typescript
{
  spender: "0x...",
  amount: "50000000000000000000",  // 50 credits (18 decimals)
  activityId: "1",  // ID from activities.ts
  nonce: "3",
  deadline: "1733529600"
}
```

---

## Error Handling & Edge Cases

### Common Error Types

**1. Signature Errors**
- `InvalidSignature`: Signature does not match recovered signer
  - **Cause:** Wrong chip used, corrupted signature data
  - **Recovery:** Retry with correct chip

- `UnauthorizedSigner`: Chip not registered to payer
  - **Cause:** Chip ownership not in registry
  - **Recovery:** Register chip first at `/register`

- `ExpiredSignature`: Deadline passed
  - **Cause:** User took too long between signing and submission, or clock skew
  - **Recovery:** Generate new signature with fresh deadline

**2. Nonce Errors**
- `InvalidNonce`: Nonce mismatch
  - **Cause:** Nonce already used, or nonce from stale read
  - **Recovery:** Refetch nonce from contract, rebuild signature

**3. Token Errors**
- `ERC20: insufficient allowance`
  - **Cause:** User didn't approve contract to spend tokens
  - **Recovery:** Navigate to `/approve`, approve tokens, retry

- `ERC20: transfer amount exceeds balance`
  - **Cause:** User doesn't have enough tokens
  - **Recovery:** Show clear error: "Insufficient USDC balance", suggest funding wallet

- `InsufficientBalance` (credits)
  - **Cause:** User trying to spend more credits than they own
  - **Recovery:** Show current balance, suggest buying more credits

**4. Network/RPC Errors**
- Timeout waiting for transaction
  - **Cause:** RPC slow, network congestion
  - **Recovery:** Retry with same nonce (idempotent), or show txHash for user to track

- Transaction reverted (unknown reason)
  - **Cause:** Contract-level revert (e.g., custom validation failed)
  - **Recovery:** Parse revert reason from receipt, show to user

**5. Database Errors**
- Foreign key constraint violation
  - **Cause:** User doesn't exist in users table
  - **Recovery:** `ensureUserExists()` creates placeholder user

- Unique constraint violation
  - **Cause:** Duplicate chip address, duplicate Circle member
  - **Recovery:** Show error, prevent duplicate entries in UI

### Edge Cases Handled in Code

**Circle Auto-Split:**
- If Circle has no members: No auto-split occurs (requires at least 1 member)
- If expense creation fails: Payment still succeeds (Circle split is non-critical)
- If payment request creation fails: Logged but doesn't block payment

**Payment Requests:**
- Expired requests: Status can be updated to 'expired' (no automatic job currently)
- Paying expired request: Should check `expires_at` before allowing payment
- Request already paid: Check `status == 'pending'` before showing pay button

**NFC Chip Reading:**
- User cancels tap: `useHaloChip` hook catches error, allows retry
- Multiple taps needed (register flow): UI guides user through 2 taps (read chip, sign)
- Wrong chip used: Signature verification fails, clear error shown

**Balance Calculation:**
- Balances < $0.01 filtered out (prevents UI clutter from rounding errors)
- Multiple expenses between same users: Aggregated into single net balance
- Settlements accounted for: Completed payments reduce debt

---

## Environment, Config & Dependencies

### Environment Variables

**Frontend (`.env.local`):**
```bash
# Supabase connection
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Relayer private key (server-side only, NEVER expose to client)
RELAYER_PRIVATE_KEY=0x1234567890abcdef...

# Optional: Alchemy RPC
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key_here

# Optional: WalletConnect
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

**Foundry (`.env`):**
```bash
DEPLOYER_PRIVATE_KEY=0xabc...
ETHERSCAN_API_KEY=your_key
```

### External Services

**Required:**
- **Supabase:** PostgreSQL database hosting
  - Connection string configured via env vars
  - Used for: users, expenses, settlements, payment_requests, circles

- **Base Sepolia RPC:** Blockchain node access
  - Default: Public Base Sepolia RPC
  - Can override in `scaffold.config.ts` via `rpcOverrides`

- **Privy:** Authentication provider
  - Twitter OAuth integration
  - Embedded wallet creation
  - API keys in Privy dashboard

**Optional:**
- **Alchemy:** RPC provider (faster/more reliable than public RPCs)
- **WalletConnect:** For connecting external wallets (currently onlyLocalBurnerWallet: true)

### Configuration Files

**`scaffold.config.ts`:**
- `targetNetworks: [baseSepolia]` - Deployment target
- `pollingInterval: 30000` - Frontend polling interval (30s)
- `onlyLocalBurnerWallet: true` - Disables external wallet connectors

**`deployedContracts.ts`:**
- Auto-generated by deployment scripts
- Maps chain ID → contract name → { address, abi }
- Example:
  ```typescript
  {
    84532: {  // Base Sepolia
      SplitHubRegistry: { address: "0x123...", abi: [...] },
      SplitHubPayments: { address: "0x456...", abi: [...] },
      CreditToken: { address: "0x789...", abi: [...] }
    }
  }
  ```

**`activities.ts`:**
- Defines available activities for credit spending
- Each activity has: id, name, credits cost, icon, color
- Example: `{ id: 1, name: "Laser Tag", credits: 50, icon: Crosshair, color: "red" }`

### Local vs Production

**Local Development:**
- Run local Anvil chain: `yarn chain`
- Deploy contracts: `yarn deploy` (to localhost)
- Frontend connects to localhost:8545
- Relayer uses local account from keystore

**Production (Base Sepolia):**
- Deploy contracts: `yarn deploy:base`
- Frontend connects to Base Sepolia RPC
- Relayer uses private key from env var
- Database: Production Supabase instance
- Contract addresses in `deployedContracts.ts` for chain 84532

---

## Glossary / Quick Reference

| Term | Definition |
|------|------------|
| **Arx Halo Chip** | NFC-enabled secure element chip that stores private key and signs transactions. User taps chip to phone to authorize payments. |
| **EIP-712** | Ethereum standard for typed structured data signing. Provides human-readable signature format and prevents signature reuse across domains. |
| **Relayer** | Backend service (API routes) that submits user-signed transactions on-chain and pays gas fees. Cannot modify signed data. |
| **Gasless Transaction** | User signs authorization off-chain (via NFC chip), relayer pays gas to submit on-chain. User pays zero gas fees. |
| **Nonce** | Monotonically increasing counter per user in each contract. Prevents replay attacks and enforces transaction order. |
| **Deadline** | Unix timestamp after which a signature is invalid. Prevents old signatures from being used indefinitely. |
| **Circle** | User-defined group of friends for automatic expense splitting. When creator pays, expense auto-splits with circle members. |
| **Payment Request** | Database record with shareable link (UUID-based URL) that requests payment from specific user. |
| **Credits** | ERC-20 tokens for venue's closed-loop system. Exchange rate: 1 USDC = 10 credits. Burned when spent at activities. |
| **Activity** | Venue attraction (Laser Tag, Bowling, etc.) that costs credits to access. activityId tracked on-chain when credits spent. |
| **Settlement** | Database record of on-chain payment between users. Tracks payer, payee, amount, tx hash. |
| **Expense** | Database record of bill to split among participants. Each participant gets share_amount. |
| **Balance** | Net amount owed between two users. Positive = friend owes you, negative = you owe friend. Calculated from expenses and settlements. |
| **Base Sepolia** | Ethereum Layer 2 testnet. Target network for SplitHub. Chain ID: 84532. Low gas fees, fast finality. |
| **USDC** | USD Coin stablecoin (ERC-20). Used for payments and credit purchases. 6 decimals. |
| **Supabase** | Backend-as-a-Service providing PostgreSQL database, auth, and real-time subscriptions. Used for all off-chain data. |
| **Privy** | Authentication service. Handles Twitter OAuth and creates embedded wallets for users. |
| **Embedded Wallet** | Wallet created and managed by Privy. User doesn't need to install MetaMask or manage seed phrase. |

---

**Last Updated:** 2025-12-07
**Schema Version:** 004 (includes onboarding refactor, approval tracking)
**Contract Deployment:** Base Sepolia (Chain ID: 84532)
**Source:** Full codebase analysis from repository state

**Recent Updates (2025-12-07):**
- Added skip chip registration functionality (users can complete onboarding without NFC chip)
- Implemented `/api/onboarding/finalize` atomic endpoint for onboarding flow
- Added `chip_registration_status` and `approval_status` fields to users table
- Refactored loading states architecture (minimal `loading.tsx` files + page-level granular states)
- Added `skipLoadingStates` sessionStorage flag to prevent loading flashes during onboarding
- Implemented error handling for approval flow (transaction rejection, network errors)
- Database tracking of approval completion status
- Created reusable loading components (`LoadingUI`, `LoadingCard`) following DRY principles
- `UserSyncWrapper` now handles all onboarding routing logic as single source of truth

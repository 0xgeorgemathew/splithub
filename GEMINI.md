# Project Overview

This project, SplitHub, is a "Tap-to-Pay" crypto payment system that uses Arx Halo Chips for authentication. It's a monorepo containing two main packages: a Solidity-based smart contract suite and a Next.js frontend application. The goal is to provide a seamless payment experience, similar to Splitwise but for web3, and also to offer a closed-loop payment system for venues.

# Tech Stack

-   **Frontend:** Next.js 15, React 19, Wagmi/Viem, Privy (Twitter OAuth), TailwindCSS + DaisyUI
-   **Smart Contracts:** Solidity 0.8.19, Foundry, OpenZeppelin
-   **Blockchain:** Base (Ethereum L2), Base Sepolia (84532) for testnet
-   **Hardware:** Arx Halo Chips (NFC) via `@arx-research/libhalo`
-   **Database:** Supabase (PostgreSQL)
-   **State Management:** Zustand

# Architecture

The project is a monorepo with two main packages:

-   `packages/foundry`: Contains the Solidity smart contracts for the payment system.
    -   `contracts/`: Contains the source code for contracts like `SplitHubRegistry`, `SplitHubPayments`, and `CreditToken`.
-   `packages/nextjs`: Contains the Next.js frontend application.
    -   `app/api/relay/`: Gasless transaction endpoints.
    -   `services/`: Business logic services (e.g., `balanceService`, `expenseService`).
    -   `hooks/`: Custom hooks (e.g., `useHaloChip`).

# Smart Contracts

-   **SplitHubRegistry:** Links NFC chips to wallet addresses. Verifies ownership.
-   **SplitHubPayments:** Handles gasless token transfers via EIP-712 signatures.
-   **CreditToken:** ERC-20 token used for credits (1 USDC = 10 credits).

# Database Schema (Supabase)

## users
-   `wallet_address` (PK), `chip_address` (UNIQUE), `name`, `email`
-   `chip_registration_status`: pending | registered | skipped | null
-   `approval_status`: pending | completed | null
-   `privy_user_id`, `twitter_handle`, `twitter_profile_url`, `twitter_user_id`

## expense
-   `id` (PK), `creator_wallet` (FK), `description`, `total_amount`, `token_address`
-   `status`: active | settled | cancelled

## expense_participants
-   `expense_id` (FK), `wallet_address` (FK), `share_amount`, `is_creator`
-   UNIQUE constraint on (expense_id, wallet_address)

## settlements
-   `payer_wallet` (FK), `payee_wallet` (FK), `amount`, `token_address`, `tx_hash`
-   `status`: pending | completed | failed

## payment_requests
-   `id` (UUID PK), `payer` (FK), `recipient` (FK), `token`, `amount`, `memo`
-   `status`: pending | completed | expired
-   `expires_at`, `tx_hash`, `requester_twitter`, `payer_twitter`

## circles
-   `id` (UUID PK), `name`, `creator_wallet` (FK), `is_active`

## circle_members
-   `circle_id` (FK), `member_wallet` (FK)
-   UNIQUE constraint on (circle_id, member_wallet)

# Core Flows

## Payment Flow
1.  **Construct Auth:** Frontend builds EIP-712 `PaymentAuth` object: `{ payer, recipient, token, amount, nonce, deadline }`.
2.  **Sign:** User taps NFC chip to sign the typed data.
3.  **Relay:** Frontend POSTs to `/api/relay/payment` with the auth object and signature.
4.  **Verify:** Smart contract verifies the deadline, nonce, signature, and checks if the chip belongs to the payer.
5.  **Execute:** Contract executes `safeTransferFrom` to move tokens.

## Balance Calculation
Logic primarily in `services/balanceService.ts`.
-   **Expenses (Creator):** Friends owe the user.
-   **Expenses (Participant):** User owes the creator.
-   **Settlements:** Subtract completed settlements from debts/credits.
-   **Result:** Positive value = you are owed; Negative value = you owe.

## Onboarding
1.  **Auth:** User logs in via Twitter (Privy), creating an embedded wallet.
2.  **Sync:** `UserSyncWrapper` ensures the user exists in the Supabase database.
3.  **Chip Setup:** User registers a chip (or skips).
4.  **Finalize:** Calls `/api/onboarding/finalize`.
5.  **Redirect:** User goes to `/approve` (for token approvals) or directly to `/splits`.

# Security

-   **Nonce:** Prevents replay attacks; must match the current contract state.
-   **Deadline:** Signatures expire after a short period (approx. 1 hour).
-   **Registry:** The payment contract verifies `registry.ownerOf(chipAddress) == payer` to ensure only the chip owner can authorize payments.

# Key Files

-   `app/api/relay/payment/route.ts`: The payment relayer endpoint.
-   `services/balanceService.ts`: Logic for calculating user balances.
-   `hooks/halochip-arx/useHaloChip.ts`: Hook for handling NFC signing interactions.
-   `components/UserSyncWrapper.tsx`: Handles user synchronization and onboarding state.
-   `foundry/contracts/SplitHubPayments.sol`: The core payment smart contract.

# Building and Running

## Key Commands

1.  **Install dependencies:**
    ```bash
    yarn install
    ```
2.  **Start local blockchain (Anvil):**
    ```bash
    yarn chain
    ```
3.  **Deploy smart contracts (Localhost):**
    ```bash
    yarn deploy
    ```
    *To deploy to Base Sepolia:* `yarn deploy:base`
4.  **Run frontend:**
    ```bash
    yarn start
    ```
    The app will be at `http://localhost:3000`.

## Other useful commands

-   `yarn test`: Run Solidity tests.
-   `yarn lint`: Lint Solidity and Next.js code.
-   `yarn format`: Format code in both packages.

# Routes

-   `/register`: Chip registration page.
-   `/approve`: ERC-20 token approval page.
-   `/splits`: Main dashboard showing balances and expenses.
-   `/settle`: Quick payment interface.
-   `/expense/add`: Create a new expense.

# Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `InvalidNonce` | Refetch the latest nonce from the contract. |
| `ExpiredSignature` | Generate a new signature (tap chip again). |
| `UnauthorizedSigner` | Ensure the chip is registered to the wallet trying to pay. |
| `insufficient allowance` | Navigate to `/approve` to increase token allowance. |

# Development Conventions

-   **Package Manager:** Yarn.
-   **Contracts:** Foundry framework.
-   **Frontend:** Next.js.
-   **Style:** Prettier for formatting, ESLint for linting.
-   **Hooks:** Husky runs `lint-staged` on pre-commit.
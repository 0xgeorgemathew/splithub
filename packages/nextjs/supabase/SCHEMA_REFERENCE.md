# Ready for Railway Deployment Updates

# SplitHub Database Schema Reference

This document reflects the **actual** schema as verified from Supabase Dashboard on 2025-12-04.

## Tables Overview

| Table Name             | Rows | Size  | Columns | Status    |
| ---------------------- | ---- | ----- | ------- | --------- |
| `users`                | 8    | 80 kB | 9       | ✅ Active |
| `expense`              | 9    | 32 kB | 7       | ✅ Active |
| `expense_participants` | 28   | 32 kB | 6       | ✅ Active |
| `settlements`          | 9    | 32 kB | 9       | ✅ Active |
| `payment_requests`     | 0    | 56 kB | 13      | ✅ Active |

---

## 1. users

**Purpose:** User profiles linked to wallet addresses and NFC chips

| Column                | Type        | Nullable | Default | Description                                |
| --------------------- | ----------- | -------- | ------- | ------------------------------------------ |
| `wallet_address`      | text        | ❌       | -       | PRIMARY KEY - User's wallet address        |
| `chip_address`        | text        | ✅       | null    | UNIQUE - NFC chip address                  |
| `name`                | text        | ❌       | -       | Display name                               |
| `email`               | text        | ✅       | null    | Email (optional after Twitter integration) |
| `created_at`          | timestamptz | ❌       | NOW()   | Record creation timestamp                  |
| `privy_user_id`       | text        | ✅       | null    | UNIQUE - Privy user ID                     |
| `twitter_handle`      | text        | ✅       | null    | Twitter username (without @)               |
| `twitter_profile_url` | text        | ✅       | null    | Twitter profile picture URL                |
| `twitter_user_id`     | text        | ✅       | null    | Twitter OAuth user ID                      |

**Indexes:**

- `users_pkey` - PRIMARY KEY (wallet_address)
- `users_chip_address_key` - UNIQUE (chip_address)
- `users_privy_user_id_key` - UNIQUE (privy_user_id)
- `idx_users_chip_address` - INDEX (chip_address)
- `idx_users_email` - INDEX (email)
- `idx_users_privy_id` - INDEX (privy_user_id)
- `idx_users_twitter_handle` - INDEX (twitter_handle)
- `idx_users_twitter_handle_lower` - INDEX (LOWER(twitter_handle))

**Constraints:**

- `check_auth_method` - CHECK (email IS NOT NULL OR privy_user_id IS NOT NULL)

---

## 2. expense

**Purpose:** Expense records with total amount to be split among participants

| Column           | Type             | Nullable | Default  | Description                         |
| ---------------- | ---------------- | -------- | -------- | ----------------------------------- |
| `id`             | int8 (bigserial) | ❌       | auto     | PRIMARY KEY                         |
| `created_at`     | timestamptz      | ❌       | NOW()    | Record creation timestamp           |
| `creator_wallet` | text             | ❌       | -        | FOREIGN KEY → users(wallet_address) |
| `description`    | text             | ✅       | null     | Expense description                 |
| `total_amount`   | numeric          | ❌       | -        | Total expense amount                |
| `status`         | text             | ❌       | 'active' | Status: active, settled, cancelled  |
| `token_address`  | text             | ❌       | -        | ERC20 token contract address        |

**Indexes:**

- `expense_pkey` - PRIMARY KEY (id)
- `idx_expense_creator_wallet` - INDEX (creator_wallet)
- `idx_expense_status` - INDEX (status)
- `idx_expense_created_at` - INDEX (created_at DESC)

**Constraints:**

- CHECK (status IN ('active', 'settled', 'cancelled'))
- FOREIGN KEY (creator_wallet) REFERENCES users(wallet_address) ON DELETE CASCADE

---

## 3. expense_participants

**Purpose:** Junction table linking users to expenses with their share amounts

| Column           | Type             | Nullable | Default | Description                            |
| ---------------- | ---------------- | -------- | ------- | -------------------------------------- |
| `id`             | int8 (bigserial) | ❌       | auto    | PRIMARY KEY                            |
| `created_at`     | timestamptz      | ❌       | NOW()   | Record creation timestamp              |
| `expense_id`     | int8 (bigint)    | ✅       | null    | FOREIGN KEY → expense(id)              |
| `wallet_address` | text             | ✅       | null    | FOREIGN KEY → users(wallet_address)    |
| `share_amount`   | numeric          | ✅       | null    | Amount this participant owes/is owed   |
| `is_creator`     | boolean          | ✅       | null    | True if participant is expense creator |

**Indexes:**

- `expense_participants_pkey` - PRIMARY KEY (id)
- `expense_participants_expense_id_wallet_address_key` - UNIQUE (expense_id, wallet_address)
- `idx_expense_participants_expense_id` - INDEX (expense_id)
- `idx_expense_participants_wallet` - INDEX (wallet_address)
- `idx_expense_participants_is_creator` - INDEX (is_creator)

**Constraints:**

- UNIQUE (expense_id, wallet_address)
- FOREIGN KEY (expense_id) REFERENCES expense(id) ON DELETE CASCADE
- FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE

---

## 4. settlements

**Purpose:** On-chain payment settlements between users

| Column          | Type             | Nullable | Default   | Description                         |
| --------------- | ---------------- | -------- | --------- | ----------------------------------- |
| `id`            | int8 (bigserial) | ❌       | auto      | PRIMARY KEY                         |
| `created_at`    | timestamptz      | ❌       | NOW()     | Record creation timestamp           |
| `payer_wallet`  | text             | ❌       | -         | FOREIGN KEY → users(wallet_address) |
| `payee_wallet`  | text             | ❌       | -         | FOREIGN KEY → users(wallet_address) |
| `amount`        | numeric          | ❌       | -         | Payment amount                      |
| `token_address` | text             | ❌       | -         | ERC20 token contract address        |
| `tx_hash`       | text             | ✅       | null      | Blockchain transaction hash         |
| `status`        | text             | ❌       | 'pending' | Status: pending, completed, failed  |
| `completed_at`  | timestamptz      | ✅       | null      | Completion timestamp                |

**Indexes:**

- `settlements_pkey` - PRIMARY KEY (id)
- `idx_settlements_payer_wallet` - INDEX (payer_wallet)
- `idx_settlements_payee_wallet` - INDEX (payee_wallet)
- `idx_settlements_status` - INDEX (status)
- `idx_settlements_tx_hash` - INDEX (tx_hash)
- `idx_settlements_created_at` - INDEX (created_at DESC)

**Constraints:**

- CHECK (status IN ('pending', 'completed', 'failed'))
- CHECK (payer_wallet != payee_wallet)
- FOREIGN KEY (payer_wallet) REFERENCES users(wallet_address) ON DELETE CASCADE
- FOREIGN KEY (payee_wallet) REFERENCES users(wallet_address) ON DELETE CASCADE

---

## 5. payment_requests

**Purpose:** Payment requests that can be shared as links for Twitter-to-Twitter payments

| Column              | Type        | Nullable | Default           | Description                          |
| ------------------- | ----------- | -------- | ----------------- | ------------------------------------ |
| `id`                | uuid        | ❌       | gen_random_uuid() | PRIMARY KEY - Used in shareable URLs |
| `payer`             | text        | ❌       | -                 | FOREIGN KEY → users(wallet_address)  |
| `recipient`         | text        | ❌       | -                 | FOREIGN KEY → users(wallet_address)  |
| `token`             | text        | ❌       | -                 | ERC20 token contract address         |
| `amount`            | text        | ❌       | -                 | Payment amount (as string)           |
| `memo`              | text        | ✅       | null              | Optional payment description         |
| `status`            | text        | ❌       | 'pending'         | Status: pending, completed, expired  |
| `tx_hash`           | text        | ✅       | null              | Blockchain transaction hash          |
| `expires_at`        | timestamptz | ❌       | -                 | Expiration timestamp                 |
| `created_at`        | timestamptz | ❌       | NOW()             | Record creation timestamp            |
| `completed_at`      | timestamptz | ✅       | null              | Completion timestamp                 |
| `requester_twitter` | text        | ✅       | null              | Twitter handle of recipient          |
| `payer_twitter`     | text        | ✅       | null              | Twitter handle of payer              |

**Indexes:**

- `payment_requests_pkey` - PRIMARY KEY (id)
- `idx_payment_requests_payer` - INDEX (payer)
- `idx_payment_requests_recipient` - INDEX (recipient)
- `idx_payment_requests_status` - INDEX (status)
- `idx_payment_requests_payer_twitter` - INDEX (payer_twitter)
- `idx_payment_requests_requester_twitter` - INDEX (requester_twitter)
- `idx_payment_requests_expires_at` - INDEX (expires_at)
- `idx_payment_requests_payer_status` - INDEX (payer, status)
- `idx_payment_requests_recipient_status` - INDEX (recipient, status)

**Constraints:**

- CHECK (status IN ('pending', 'completed', 'expired'))
- CHECK (payer != recipient)
- CHECK (expires_at > created_at)
- FOREIGN KEY (payer) REFERENCES users(wallet_address) ON DELETE CASCADE
- FOREIGN KEY (recipient) REFERENCES users(wallet_address) ON DELETE CASCADE

---

## Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
│─────────────────│
│ wallet_address  │◄─┐
│ chip_address    │  │
│ name            │  │
│ email           │  │
│ privy_user_id   │  │
│ twitter_handle  │  │
└─────────────────┘  │
         ▲           │
         │           │
         │           │
    ┌────┴────┐      │
    │         │      │
    │         │      │
┌───┴──────┐ ┌┴──────────────────┐
│ expense  │ │ expense_participants│
│──────────│ │───────────────────│
│ id       │◄┤ expense_id        │
│ creator  │ │ wallet_address    │──┐
│ ...      │ │ share_amount      │  │
└──────────┘ └───────────────────┘  │
    ▲                                │
    │                                │
    │                                │
┌───┴────────────┐  ┌───────────────┴──┐
│  settlements   │  │ payment_requests │
│────────────────│  │──────────────────│
│ payer_wallet   │──┤ payer            │
│ payee_wallet   │  │ recipient        │──┘
│ tx_hash        │  │ tx_hash          │
│ ...            │  │ ...              │
└────────────────┘  └──────────────────┘
```

---

## Data Flow Examples

### Creating an Expense

```
1. User creates expense → INSERT into expense
2. Add participants → INSERT into expense_participants (multiple rows)
3. Each participant has share_amount calculated
```

### Settling a Payment

```
1. User initiates payment → INSERT into settlements (status: pending)
2. NFC chip signs transaction → Relayer submits to blockchain
3. Transaction confirmed → UPDATE settlements (status: completed, tx_hash: ...)
```

### Payment Request Flow

```
1. User A creates request → INSERT into payment_requests
2. Share link with User B → /settle/{request_id}
3. User B pays via NFC → Transaction on-chain
4. Mark complete → UPDATE payment_requests (status: completed)
```

---

**Last Updated:** 2025-12-04
**Schema Version:** 002
**Source:** Supabase Dashboard (verified)

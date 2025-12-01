<div align="center">

<img src="https://img.shields.io/badge/Base-0052FF?style=for-the-badge&logo=ethereum&logoColor=white" alt="Base" />
<img src="https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white" alt="Solidity" />
<img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />

<br />
<br />

# ✨ SplitHub

### Tap-to-Pay Payments on the Blockchain

**Splitwise meets web3 — powered by Arx Halo Chips**

<br />

[Features](#-features) · [How It Works](#-how-it-works) · [Architecture](#-technical-architecture) · [Quick Start](#-quick-start)

</div>

<br />

---

<br />

## 🎯 What is SplitHub?

SplitHub makes crypto payments as simple as tapping your phone.

No wallet popups. No seed phrases. No gas fees to manage.

**Just tap your Arx Halo Chip and go.**

<br />

> We built two products on a single platform — a **consumer app** for friend groups and a **B2B solution** for venues.

<br />

---

<br />

## 🚀 Features

<br />

### 💸 Bill Split

<table>
<tr>
<td width="50%">

**The Problem**

Splitting bills with friends is awkward. Venmo requests go ignored. "I'll get you next time" never happens.

And if your friends hold crypto? Wallet confirmations and gas fees kill the vibe.

</td>
<td width="50%">

**The Solution**

Track who owes what, then settle instantly with a single tap of your Arx Halo Chip.

No apps to open. No amounts to confirm. No gas to calculate.

</td>
</tr>
</table>

**How it works:**

```
1. View your balances — green means they owe you, red means you owe them
2. Tap a friend's card to settle up
3. Hold your Arx Halo Chip to your phone
4. Done. Payment complete. On-chain. Final.
```

<br />

---

<br />

### 🎮 Closed-Loop Stored Value

<table>
<tr>
<td width="50%">

**The Problem**

Venues want cashless payments. Users don't want to fumble with cards or phones.

Traditional systems require expensive POS integrations.

</td>
<td width="50%">

**The Solution**

A prepaid credit system powered by blockchain. Buy credits with USDC, spend them at activities — all with a tap of your Arx Halo Chip.

</td>
</tr>
</table>

<br />

| Buy Credits | Spend Credits |
|-------------|---------------|
| 1. Enter USDC amount | 1. Select an activity |
| 2. Tap your Arx Halo Chip | 2. Tap your Arx Halo Chip |
| 3. Credits added instantly | 3. Access granted |

<br />

> **1 USDC = 10 Credits**
>
> Perfect for arcades, festivals, resorts, theme parks — anywhere you want frictionless, cashless payments.

<br />

---

<br />

## 🔐 How It Works

<br />

### The Arx Halo Chip

The **Arx Halo Chip** is a secure element that stores your private key. When you tap:

- ✅ The chip signs an EIP-712 message authorizing the payment
- ✅ The private key **never leaves** the chip
- ✅ No wallet popup, no confirmation screen
- ✅ Impossible to clone or extract the key

It's the same security model as your credit card's EMV chip — but for crypto.

<br />

### The Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │      │                 │
│  Arx Halo Chip  │ ───▶ │     Relayer     │ ───▶ │    Contract     │ ───▶ │   Settlement    │
│     (Sign)      │      │    (Submit)     │      │    (Verify)     │      │   (Transfer)    │
│                 │      │                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
```

<br />

| Step | What Happens |
|------|--------------|
| **1. Sign** | Arx Halo Chip signs EIP-712 typed data containing payer, recipient, amount, nonce, deadline |
| **2. Submit** | Relayer receives signature, wraps it in a transaction, pays gas, submits on-chain |
| **3. Verify** | Smart contract verifies signature matches a registered chip |
| **4. Transfer** | Tokens move instantly. On-chain finality. No chargebacks. |

<br />

> **Why can't the relayer steal funds?**
>
> The signature locks every field. If the relayer changes anything — even 1 wei — the signature becomes invalid. The relayer can only deliver the payment as-is.

<br />

---

<br />

## 🏗 Technical Architecture

<br />

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER LAYER                                     │
│                                                                             │
│           ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│           │   Register   │    │     Home     │    │   Credits    │         │
│           │     Page     │    │   Balances   │    │     Page     │         │
│           └──────┬───────┘    └──────┬───────┘    └──────┬───────┘         │
│                  │                   │                   │                  │
└──────────────────┼───────────────────┼───────────────────┼──────────────────┘
                   │                   │                   │
                   ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ARX HALO CHIP LAYER                                │
│                                                                             │
│                      Signs EIP-712 typed data on tap                        │
│                  Private key never leaves secure element                    │
│                                                                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            RELAYER LAYER                                    │
│                                                                             │
│                 Receives signature • Submits tx • Pays gas                  │
│                       Cannot modify signed payload                          │
│                                                                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONTRACT LAYER                                    │
│                                                                             │
│    ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐     │
│    │  SplitHubRegistry │  │ SplitHubPayments  │  │    CreditToken    │     │
│    │                   │  │                   │  │                   │     │
│    │   chip ↔ wallet   │  │  verify + send    │  │   buy + spend     │     │
│    │      mapping      │  │      tokens       │  │     credits       │     │
│    └───────────────────┘  └───────────────────┘  └───────────────────┘     │
│                                                                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BASE L2 (BLOCKCHAIN)                               │
│                                                                             │
│               Instant finality  •  Sub-cent fees  •  EVM                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

<br />

---

<br />

## 📜 Smart Contracts

<br />

### `SplitHubRegistry`

> Links Arx Halo Chips to user wallets. The identity layer.

| Function | Purpose |
|----------|---------|
| `register(signer, owner, signature)` | Link a chip to a wallet. Requires Arx Halo Chip signature to prove ownership. |
| `ownerOf(signer)` | Look up which wallet owns a chip |
| `signerOf(owner)` | Look up which chip belongs to a wallet |

<br />

### `SplitHubPayments`

> Executes peer-to-peer token transfers via Arx Halo Chip signatures.

| Function | Purpose |
|----------|---------|
| `executePayment(auth, signature)` | Transfer tokens from payer to recipient. Verifies chip signature, checks nonce, moves funds. |
| `getNonce(payer)` | Get current nonce for replay protection |
| `getDigest(auth)` | Compute signing hash for off-chain use |

```solidity
struct PaymentAuth {
    address payer;      // Who's paying
    address recipient;  // Who receives
    address token;      // Which token
    uint256 amount;     // How much
    uint256 nonce;      // Replay protection
    uint256 deadline;   // Expiration
}
```

<br />

### `CreditToken`

> ERC-20 token for the closed-loop stored value system.

| Function | Purpose |
|----------|---------|
| `purchaseCredits(purchase, signature)` | Buy credits with USDC. Transfers USDC, mints credits. |
| `spendCredits(spend, signature)` | Spend credits at an activity. Burns credits, emits event. |
| `withdrawUSDC(to)` | Venue withdraws collected USDC |

<br />

---

<br />

## 🗺 User Flows

<br />

| Route | What You Do |
|-------|-------------|
| `/register` | Create profile, link your Arx Halo Chip |
| `/` | View all balances, tap a friend to pay |
| `/credits` | Buy credits with USDC, spend at activities |
| `/approve` | One-time token approval setup |

<br />

---

<br />

## ⚡ Quick Start

<br />

```bash
# Install dependencies
yarn install

# Start local chain
yarn chain

# Deploy contracts (new terminal)
yarn deploy

# Run frontend (new terminal)
yarn start
```

Visit **http://localhost:3000**

<br />

---

<br />

## 🛠 Tech Stack

<br />

| Layer | Technology |
|-------|------------|
| **Contracts** | Solidity, Foundry, OpenZeppelin |
| **Frontend** | Next.js 15, TypeScript, Wagmi, Viem |
| **Chain** | Base (Ethereum L2) |
| **Signing** | EIP-712 typed data, ECDSA |
| **Hardware** | Arx Halo Chips (secure element) |

<br />

---

<br />

<div align="center">

### ✨ Tap. Pay. Done. ✨

<br />

**Built with Arx Halo Chips**

</div>

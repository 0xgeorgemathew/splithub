# SplitHub

SplitHub is a tap-to-pay payment platform built on blockchain. Users authenticate payments by tapping an Arx Halo Chip—an NFC wearable containing a secure private key—against their phone. The chip signs an EIP-712 message authorizing the transaction, a relayer submits it on-chain and pays gas, and the user never sees a wallet popup or confirmation screen. This enables three core experiences: splitting expenses with friends, collecting payments at events, and purchasing prepaid venue credits.

---

## Core Concepts

### Users

Users sign in with Twitter via Privy, which creates an embedded blockchain wallet linked to their account. During onboarding, users register their Arx Halo Chip by tapping it to cryptographically link the chip's address to their wallet. Once registered, the chip becomes the user's authentication method for all payments.

### The Arx Halo Chip

The Halo Chip is a secure element embedded in an NFC wearable (wristband, ring, or card). It stores a private key that never leaves the chip and cannot be extracted or cloned. When tapped against a phone:

1. The app presents an EIP-712 typed data structure describing the payment
2. The chip signs this data, producing a cryptographic signature
3. The signature proves the chip holder authorized this specific transaction

This is the same security model as EMV credit card chips, applied to blockchain payments.

### Real-time Updates

All state changes appear instantly across devices. When an expense is created, balances update immediately. When a payment completes at an event stall, the operator sees it appear in their dashboard with an audio notification. This is powered by Supabase real-time subscriptions that push database changes to connected clients.

### Gasless Transactions

Users never pay gas fees or manage blockchain complexity. The flow works as follows:

User taps chip → Chip signs authorization → App sends signature to relayer → Relayer submits transaction and pays gas → Contract verifies signature and executes

The relayer cannot steal funds or modify payments because the signature locks every field. Any change invalidates the signature.

### Balance Model

When you owe someone money, your balance with them is negative (displayed in red). When someone owes you, your balance is positive (displayed in teal). Settlements move balances toward zero. A fully settled relationship shows no entry in your ledger.

---

## Splitting Expenses

Splitting expenses lets users track shared costs with friends and settle debts with a single tap.

### Creating an Expense

From the splits dashboard, users tap "Add Expense" and enter:
- An amount
- A description (e.g., "Dinner at Joe's")
- One or more friends to split with

The app divides the total equally among all participants, including the creator. Each participant's share appears as an update to their balance with the expense creator.

### The Balance Ledger

The splits dashboard shows a ledger of all friends you have active balances with:

- **Teal entries** show friends who owe you money, with the amount displayed
- **Red entries** show friends you owe money to

The list is sorted by amount, with the largest balances first. When all debts are settled with a friend, they disappear from the ledger.

### Settling a Debt

When you owe someone money, tapping their entry in the ledger initiates settlement:

1. A confirmation screen shows the recipient and amount
2. You tap your Halo Chip to authorize
3. The app shows processing states as the transaction confirms
4. On success, you see a receipt with the transaction hash
5. Your balance updates immediately

The payment transfers USDC directly from your wallet to theirs, recorded permanently on-chain.

### Requesting Payment

When someone owes you money, you can request payment by tapping the request icon on their ledger entry. This sends them a notification. If they don't respond, you can send reminders. They can settle directly from their notifications or from their own splits dashboard.

### User Flow

Add expense → Balances update for all participants → Debtor taps chip to settle → USDC transfers on-chain → Balances update to reflect settlement

---

## Events

Events enable tap-to-pay payments at venues with multiple vendors. An event is a container that holds vendor stalls, each operated by someone who receives payments from attendees.

### How Events Work

An event owner creates an event and adds stalls to it. Each stall is assigned to an operator (identified by their Twitter handle) who runs that vendor location. When attendees pay at a stall, the payment can be split between the operator and the event owner based on a configured percentage.

### Participating in Events

**As an attendee**, you browse active stalls, select one, and choose an amount to pay. The stall terminal shows a "tap to pay" prompt. You tap your Halo Chip, see processing animations, and receive a confirmation with the transaction hash. The operator sees your payment appear in their dashboard instantly.

**As a stall operator**, you see a dashboard showing your earnings across all stalls you operate. Each stall shows its revenue, transaction count, and recent activity. When payments arrive, you hear an audio notification and see the payer's identity and amount appear in real-time.

**As an event owner**, you see aggregate metrics across all your events and stalls: total revenue, transaction counts, and active stall status. You can pause or unpause stalls and monitor the live activity feed showing all payments across your events.

### Payment Splitting

Each stall has a split percentage (0-100%) that determines how revenue is divided:

- **Operator amount**: The percentage that goes to the stall operator
- **Owner amount**: The remainder that goes to the event owner

For example, with a 70% split, an operator receives 70% of each payment and the event owner receives 30%.

### Event Structure

Event → Contains multiple stalls → Each stall has an operator → Attendees pay at stalls → Revenue splits between operator and owner

### Real-time Dashboard

All event participants see live updates:
- New payments appear instantly in activity feeds
- Revenue metrics update as transactions confirm
- Audio notifications alert operators to incoming payments
- Stall status changes propagate immediately

---

## Venue Credits

Venue credits are prepaid tokens for activity-based payments at entertainment venues. Instead of paying per-transaction, users load credits in advance and spend them at activities like laser tag, bowling, or arcade games.

### Why Credits Exist

Credits provide a frictionless experience for high-frequency, small-value transactions. Rather than authorizing each $5 arcade play individually, users load credits once and tap to access activities instantly. This also enables venues to create closed-loop economies where credits are venue-specific.

### Purchasing Credits

From the credits terminal, users:

1. Select a USDC amount ($1, $10, $20, or $50)
2. See the credit conversion—1 USDC equals 10 credits
3. Tap their Halo Chip to authorize the purchase
4. Credits are minted to their wallet

The UI shows the conversion in real-time: selecting $20 displays "+200 Credits" before confirmation.

### Spending Credits

From the activity panel, users:

1. Select an activity (each has a fixed credit cost)
2. See the credits that will be deducted
3. Tap their Halo Chip to authorize
4. Credits are burned and access is granted
5. Their remaining balance updates

Unlike regular payments where tokens transfer between wallets, spending credits burns (destroys) them. This reflects that the user has consumed a service rather than paid another person.

### Credits vs Direct Payments

| Aspect | Credits | Direct Payments |
|--------|---------|-----------------|
| Use case | Activity access at venues | Settling debts, event payments |
| Token type | Activity Credits (CR) | USDC stablecoin |
| On spend | Credits are burned | Tokens transfer to recipient |
| Conversion | 1 USDC = 10 Credits | 1:1 (USDC to USDC) |

### User Flow

Select USDC amount → See credit preview → Tap chip to purchase → Credits minted → Select activity → Tap chip to access → Credits burned

---

## How Everything Connects

Across all three features, the core experience remains consistent:

**Same authentication**: Every transaction—settling an expense, paying at a stall, or accessing an activity—requires tapping your Halo Chip. One gesture, one interaction model.

**Same gasless model**: Users never see gas fees, wallet popups, or confirmation dialogs. The relayer handles blockchain complexity invisibly.

**Unified identity**: Your Twitter login, embedded wallet, and registered Halo Chip form a single identity that works across splits, events, and credits.

**Real-time everywhere**: Whether watching your balance update after settling a debt, seeing payments arrive at your stall, or watching credits load to your account, all state changes appear instantly.

---

## Design Principles

**Real-time first**
Every state change appears instantly. No refresh buttons, no polling, no stale data. Users see the current state of the system at all times.

**Tap-to-pay simplicity**
One physical gesture—tapping the Halo Chip—completes any transaction. No wallet apps to open, no amounts to confirm, no gas to calculate.

**Gasless by default**
Users interact with blockchain without knowing it. No seed phrases, no gas management, no transaction confirmations. The relayer abstracts this entirely.

**Clarity over complexity**
Visual indicators are unambiguous: teal means positive, red means negative. Status states are explicit. Users always know what's happening and what happened.

**Predictable state changes**
When a user takes an action, the result is immediate and obvious. Balances update. Payments appear. Credits load. No uncertainty about whether something worked.

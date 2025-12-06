# Circle Feature Implementation Plan

## Overview
Add "Circle" feature to the splits page — a pre-configured group of friends that expenses automatically split with.

## User Flow

1. **Create Circle**: User goes to `/splits`, taps "Add Circle" button
2. **Configure**: Names the Circle (e.g., "Roommates"), selects friends
3. **Use Circle**: When adding an expense, user can select their Circle
4. **Auto-Split**: Expense splits evenly among Circle members
5. **Auto-Request**: Payment requests are automatically sent to each member

## Storage (Database)

### New Migration: `003_create_circles_table.sql`

```sql
-- circles table
CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- circle_members junction table
CREATE TABLE circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  member_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(circle_id, member_wallet)
);

-- Indexes
CREATE INDEX idx_circles_creator ON circles(creator_wallet);
CREATE INDEX idx_circle_members_circle ON circle_members(circle_id);
CREATE INDEX idx_circle_members_member ON circle_members(member_wallet);
```

### How to Apply Migration
Run the SQL in your Supabase Dashboard (SQL Editor) — no restart needed.

## Implementation Steps

### Step 1: Circle Service
**File**: `packages/nextjs/services/circleService.ts`

```typescript
// Functions (all async, use Supabase):
- getCirclesByCreator(creatorWallet: string): Promise<Circle[]>
- getCircleWithMembers(id: string): Promise<CircleWithMembers | null>
- createCircle(creatorWallet: string, name: string, memberWallets: string[]): Promise<Circle>
- updateCircle(id: string, name?: string, memberWallets?: string[]): Promise<Circle>
- deleteCircle(id: string): Promise<void>
```

### Step 2: Circle Management UI on Splits Page
**File**: `packages/nextjs/components/home/CircleSection.tsx`

- "Add Circle" button at top of splits page
- List of existing circles (expandable cards)
- Each circle shows: name, member avatars, edit/delete buttons
- Click to expand and see full member list

### Step 3: Create/Edit Circle Modal
**File**: `packages/nextjs/components/home/CircleModal.tsx`

- Modal with:
  - Name input field
  - FriendSelector component (reuse existing)
  - Save/Cancel buttons
- Used for both create and edit flows

### Step 4: Integrate with Expense Creation
**File**: Modify `packages/nextjs/components/expense/AddExpenseForm.tsx`

- Add "Circle" dropdown at top of friend selection
- Options: "Select friends manually" OR list of user's Circles
- When Circle selected:
  - Auto-populate selectedFriends with Circle members
  - Disable individual friend selection (or show as read-only)

### Step 5: Auto-Create Payment Requests
**File**: Modify `packages/nextjs/services/expenseService.ts`

After `createExpense()` succeeds:
```typescript
// For each participant (except creator):
await fetch('/api/payment-requests', {
  method: 'POST',
  body: JSON.stringify({
    payer: participant.walletAddress,
    recipient: creatorWallet,
    amount: shareAmount,
    memo: `Split: ${description}`,
    // ... other fields
  })
});
```

## File Changes Summary

| File | Change Type |
|------|-------------|
| `supabase/migrations/003_create_circles_table.sql` | NEW - DB migration |
| `services/circleService.ts` | NEW - Circle CRUD |
| `components/home/CircleSection.tsx` | NEW - Circle list UI |
| `components/home/CircleModal.tsx` | NEW - Create/edit modal |
| `components/expense/AddExpenseForm.tsx` | MODIFY - Add Circle selector |
| `services/expenseService.ts` | MODIFY - Auto-create payment requests |
| `app/splits/page.tsx` | MODIFY - Add CircleSection |

## UI Mockup

### Splits Page Layout
```
┌─────────────────────────────────────┐
│  My Splits                          │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │  🔵 Circles           [+ Add]  ││
│  │  ┌─────────────────────────────┐││
│  │  │ 👥 Roommates (3 people)    │││
│  │  │    Alice, Bob, Charlie      │││
│  │  └─────────────────────────────┘││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  Friend Balances                    │
│  ┌─────────────────────────────────┐│
│  │ Alice          You owe $25.00  ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Bob            Owes you $15.00 ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Add Circle Modal
```
┌─────────────────────────────────────┐
│  Create Circle                   ✕  │
├─────────────────────────────────────┤
│  Name                               │
│  ┌─────────────────────────────────┐│
│  │ Roommates                       ││
│  └─────────────────────────────────┘│
│                                     │
│  Select Friends                     │
│  ┌─────────────────────────────────┐│
│  │ ☑ Alice (@alice)               ││
│  │ ☑ Bob (@bob_smith)             ││
│  │ ☐ Charlie (@charlie)           ││
│  │ ☐ Diana (@diana_d)             ││
│  └─────────────────────────────────┘│
│                                     │
│  [Cancel]              [Create]     │
└─────────────────────────────────────┘
```

## Edge Cases

1. **Empty Circle**: Require at least 1 friend to create
2. **Deleted Friend**: CASCADE delete removes them from circle_members automatically
3. **Duplicate Names**: Allow (circles identified by UUID internally)

## Future Enhancements (Not in Scope)

- "Default Circle" that auto-applies to all new expenses
- Circle templates ("Dinner split", "Rent split" with custom percentages)
- Invite friends to join a Circle (vs just adding them)
- Uneven split percentages

# Circle Feature Implementation Plan

## Overview
Add "Circle" feature — when you tap & pay via the relayer, expenses auto-split with your Circle members.

## User Flow

1. **Create Circle**: User goes to `/splits`, taps "Add Circle" button
2. **Configure**: Names the Circle (e.g., "Roommates"), adds John & Jeff
3. **Tap & Pay**: User taps chip to pay $100 via relayer
4. **Auto-Split**: Relayer detects Circle → splits $100 ÷ 3 = $33.33 each
5. **Auto-Request**: John & Jeff get payment requests for $33.33
6. **Leave Circle**: John or Jeff can leave the Circle anytime

## Storage (Database)

### New Migration: `003_create_circles_table.sql`

```sql
-- circles table
CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
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

-- Only one active circle per user
CREATE UNIQUE INDEX idx_circles_active_per_user
ON circles(creator_wallet) WHERE is_active = true;
```

**Note:** Added `is_active` column so users can have multiple circles but only one active at a time.

### How to Apply Migration
1. Go to https://supabase.com → Log in → Open your project
2. Click **SQL Editor** in left sidebar
3. Paste the SQL from the migration file
4. Click **Run**
5. Done! Tables are created.

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

### Step 4: Modify Relayer to Auto-Split
**File**: Modify `packages/nextjs/app/api/relay/payment/route.ts`

After successful payment:
```typescript
// 1. Check if payer has active Circle
const circle = await getActiveCircle(payerWallet);

if (circle) {
  // 2. Get Circle members
  const members = await getCircleMembers(circle.id);

  // 3. Calculate split (amount ÷ (members + 1 for payer))
  const splitAmount = amount / (members.length + 1);

  // 4. Create payment request for each member
  for (const member of members) {
    await createPaymentRequest({
      payer: member.wallet_address,
      recipient: payerWallet,
      amount: splitAmount,
      memo: `Circle split`,
    });
  }
}
```

### Step 5: Leave Circle Feature
**File**: `packages/nextjs/app/api/circles/leave/route.ts`

- Members can leave a Circle they're part of
- Removes them from `circle_members` table
- They stop getting auto-split requests

## File Changes Summary

| File | Change Type |
|------|-------------|
| `supabase/migrations/003_create_circles_table.sql` | NEW - DB migration |
| `services/circleService.ts` | NEW - Circle CRUD |
| `components/home/CircleSection.tsx` | NEW - Circle list UI |
| `components/home/CircleModal.tsx` | NEW - Create/edit modal |
| `app/api/relay/payment/route.ts` | MODIFY - Auto-split with Circle |
| `app/api/circles/leave/route.ts` | NEW - Leave Circle endpoint |
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

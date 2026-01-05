# SplitHub Components Refactoring Strategy

## Overview

This strategy addresses 16 categories of readability and understandability issues across the components folder. The refactoring is organized into 4 phases, prioritizing changes that:

1. **Enable other refactors** (infrastructure first)
2. **Provide immediate clarity gains** (quick wins)
3. **Reduce cognitive load** (decomposition)
4. **Ensure consistency** (final pass)

Each phase is designed to be completed independently while respecting dependencies. The focus is on **readability and understandability over performance**.

---

## Phase 1: Quick Wins

These refactors can be done independently and provide immediate clarity improvements.

### 1.1 Extract Magic Numbers to Named Constants

**Files to modify:**
- `packages/nextjs/components/approve/ApprovalFlow.tsx`
- `packages/nextjs/components/register/RegisterChipForm.tsx`
- `packages/nextjs/components/credits/POSFullScreen.tsx`

**Approach:**
Create `packages/nextjs/constants/app.constants.ts`:
```typescript
// Token amounts (in token units, not wei)
export const DEFAULT_APPROVAL_AMOUNT = "1000"; // 1000 USDC - sufficient for ~100 transactions

// NFC timing (in milliseconds)
export const NFC_TAP_COOLDOWN_MS = 300; // Hardware requires 300ms between chip reads

// Animation configs
export const SPRING_CONFIGS = {
  gentle: { tension: 120, friction: 14 },     // For success animations
  bouncy: { tension: 300, friction: 10 },     // For attention-grabbing states
  smooth: { tension: 180, friction: 12 },     // For general transitions
} as const;
```

**Expected outcome:**
- All magic numbers replaced with self-documenting constants
- Comments explain WHY each value was chosen
- Constants file serves as central reference for tuning values

---

### 1.2 Create Shared Error Formatting Utility

**Files to modify:**
- `packages/nextjs/components/approve/ApprovalFlow.tsx`
- `packages/nextjs/components/register/RegisterChipForm.tsx`
- All components with wallet/transaction errors

**Approach:**
Create `packages/nextjs/utils/errorFormatting.ts`:
```typescript
/**
 * Formats wallet/transaction errors into user-friendly messages
 */
export function formatWalletError(error: unknown): string {
  const errorMsg = error instanceof Error ? error.message : String(error);

  if (errorMsg.includes("User rejected")) {
    return "Transaction was cancelled. Please try again.";
  }
  if (errorMsg.includes("insufficient")) {
    return "Insufficient balance to complete transaction.";
  }
  if (errorMsg.includes("network")) {
    return "Network error. Please check your connection and try again.";
  }
  if (errorMsg.includes("already registered")) {
    return "This chip is already registered to another account.";
  }

  return "Transaction failed. Please try again.";
}

/**
 * Formats NFC-specific errors
 */
export function formatNFCError(error: unknown): string {
  const errorMsg = error instanceof Error ? error.message : String(error);

  if (errorMsg.includes("timeout")) {
    return "Chip tap timed out. Please hold your phone steady against the chip.";
  }
  if (errorMsg.includes("not supported")) {
    return "NFC is not supported on this device.";
  }

  return formatWalletError(error);
}
```

**Expected outcome:**
- Consistent error messages across the app
- Specific guidance for each error type
- Centralized location to improve error messages

---

### 1.3 Standardize Loading State Components

**Files to create:**
- `packages/nextjs/components/common/LoadingStates.tsx`

**Files to modify:**
- `packages/nextjs/components/home/FriendBalancesList.tsx`
- `packages/nextjs/components/expense/FriendSelector.tsx`
- All components with loading states

**Approach:**
Create standardized loading components:
```typescript
import { Loader2 } from "lucide-react";

/**
 * Primary loading indicator - use for important user-initiated actions
 */
export function PrimaryLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <Loader2 className="w-8 h-8 animate-spin text-[#00E0B8]" />
      {message && <p className="text-sm text-gray-400">{message}</p>}
    </div>
  );
}

/**
 * Inline loader - use within buttons or small components
 */
export function InlineLoader() {
  return <Loader2 className="w-4 h-4 animate-spin" />;
}

/**
 * Skeleton loader - use for content that's loading in place
 */
export function SkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-700 h-16 rounded-lg" />
      ))}
    </div>
  );
}
```

**Expected outcome:**
- Consistent visual feedback throughout the app
- Clear semantic meaning (primary vs inline vs skeleton)
- Single source of truth for loading states

---

### 1.4 Document Two-Tap Flow and Complex Business Logic

**Files to modify:**
- `packages/nextjs/components/settle/hooks/useMultiSettleFlow.ts`
- `packages/nextjs/components/UserSyncWrapper.tsx`

**Approach:**
Add comprehensive JSDoc comments explaining the business logic.

For `useMultiSettleFlow.ts`:
```typescript
/**
 * Multi-settle flow hook for batch payments using NFC chips
 *
 * CRITICAL: This flow requires TWO NFC taps per participant:
 * 1. First tap: Signs transaction with placeholder address (0x000...000)
 *    - This is necessary because we don't know payer's address yet
 *    - The signature proves the chip holder authorized the payment
 * 2. Second tap: Reveals actual chip address to complete participant data
 *    - This address is verified against SplitHubRegistry on-chain
 *
 * Flow states:
 * - collecting: Gathering signatures from all participants
 * - submitting: Sending batch transaction to relayer
 * - confirming: Waiting for blockchain confirmation
 * - success: Transaction completed successfully
 * - error: Something went wrong at any step
 */
```

For `UserSyncWrapper.tsx`, add state machine diagram:
```typescript
/**
 * Onboarding state machine:
 *
 * New User -> Register Chip -> Approve Tokens -> Splits Dashboard
 *                 | skip              |
 *             No Chip Flow        Complete
 *
 * Possible states:
 * 1. No chip_address + chip_registration_status = null -> /register
 * 2. chip_registration_status = "skipped" -> /approve
 * 3. chip_address exists + approval_status = null -> /approve
 * 4. chip_address exists + approval_status = "completed" -> /splits
 */
```

**Expected outcome:**
- Complex flows are self-documenting
- Future maintainers understand WHY (not just WHAT)
- Edge cases are explicitly handled

---

### 1.5 Extract Utility Functions from Components

**Files to modify:**
- `packages/nextjs/components/TopNav.tsx`
- `packages/nextjs/components/home/FriendBalancesList.tsx`

**Approach:**
Create `packages/nextjs/utils/addressHelpers.ts`:
```typescript
/**
 * Truncates Ethereum address for display
 */
export function truncateAddress(
  address: string,
  startLength = 6,
  endLength = 4
): string {
  if (address.length < startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Copies text to clipboard and returns success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy:", error);
    return false;
  }
}
```

**Expected outcome:**
- Components focus on UI logic only
- Utilities are testable in isolation
- Functions can be reused across components

---

### 1.6 Standardize Hook Return Value Naming

**Files to modify:**
- `packages/nextjs/components/settle/hooks/useSettleFlow.ts`
- `packages/nextjs/components/expense/hooks/useExpenseForm.ts`
- All custom hooks

**Approach:**
Establish naming conventions:

**For action hooks (trigger flows):**
- Use `initiate` prefix: `initiateSettle`, `initiatePayment`
- Return object: `{ initiate, isProcessing, error, reset }`

**For form validation hooks:**
- Use `canSubmit` for boolean validation
- Return object: `{ canSubmit, errors, touched }`

**For data hooks:**
- Use `data`, `isLoading`, `error`, `refetch` pattern

**Expected outcome:**
- Predictable hook APIs across codebase
- Reduced cognitive load when using multiple hooks
- Clear semantic meaning for each property

---

## Phase 2: Core Infrastructure

These changes enable Phase 3 refactors and establish patterns for future development.

### 2.1 Create Shared Authentication Hook

**Files to create:**
- `packages/nextjs/hooks/useWalletAddress.ts`

**Files to modify:**
- `packages/nextjs/components/approve/ApprovalFlow.tsx`
- `packages/nextjs/components/expense/AddExpenseForm.tsx`
- `packages/nextjs/components/settle/SettleFlow.tsx`
- All components accessing wallet address

**Approach:**
Create centralized authentication hook:
```typescript
import { usePrivy } from "@privy-io/react-auth";

/**
 * Hook to access current user's wallet address
 * Abstracts Privy user object structure from components
 */
export function useWalletAddress() {
  const { ready, authenticated, user } = usePrivy();

  return {
    walletAddress: user?.wallet?.address as `0x${string}` | undefined,
    isAuthenticated: authenticated,
    isReady: ready,
  };
}
```

**Expected outcome:**
- Single source of truth for wallet address access
- If Privy's API changes, only update one file
- Components are decoupled from authentication provider implementation

---

### 2.2 Implement State Machine for Scattered States

**Files to modify:**
- `packages/nextjs/components/approve/ApprovalFlow.tsx`
- `packages/nextjs/components/register/RegisterChipForm.tsx`

**Approach:**
Create `packages/nextjs/hooks/useStateMachine.ts`:
```typescript
import { useReducer } from "react";

/**
 * Type-safe state machine hook
 * Prevents invalid state combinations
 */
export function useStateMachine<TState extends string, TEvent extends { type: string }>(
  initialState: TState,
  transitions: Record<TState, Record<string, TState>>
) {
  const [state, dispatch] = useReducer(
    (currentState: TState, event: TEvent): TState => {
      const nextState = transitions[currentState]?.[event.type];
      if (!nextState) {
        console.warn(`Invalid transition: ${currentState} -> ${event.type}`);
        return currentState;
      }
      return nextState;
    },
    initialState
  );

  return [state, dispatch] as const;
}
```

Refactor `ApprovalFlow.tsx`:
```typescript
// Before: 4 separate state variables
const [paymentsState, setPaymentsState] = useState<ApprovalState>("pending");
const [creditsState, setCreditsState] = useState<ApprovalState>("pending");
const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
const [isPending, setIsPending] = useState(false);

// After: Single state machine
type FlowState =
  | { status: "idle" }
  | { status: "approving-payments" }
  | { status: "approving-credits" }
  | { status: "confirming"; txHash: string }
  | { status: "complete" }
  | { status: "error"; message: string };
```

**Expected outcome:**
- Impossible states become impossible (type-safe)
- Clear state transitions
- Easier debugging
- Self-documenting flow

---

### 2.3 Create Input Validation Library

**Files to create:**
- `packages/nextjs/utils/validation.ts`

**Files to modify:**
- `packages/nextjs/components/expense/hooks/useExpenseForm.ts`
- `packages/nextjs/components/expense/AddExpenseForm.tsx`

**Approach:**
Create validation utilities:
```typescript
export const VALIDATION_LIMITS = {
  EXPENSE_AMOUNT_MAX: 10000,
  DESCRIPTION_MAX_LENGTH: 200,
  FRIENDS_MAX_COUNT: 20,
  AMOUNT_DECIMAL_PLACES: 2,
} as const;

export function validateExpenseAmount(amount: string): ValidationError | null {
  const num = parseFloat(amount);

  if (isNaN(num) || num <= 0) {
    return { field: "amount", message: "Amount must be greater than 0" };
  }

  if (num > VALIDATION_LIMITS.EXPENSE_AMOUNT_MAX) {
    return {
      field: "amount",
      message: `Amount cannot exceed $${VALIDATION_LIMITS.EXPENSE_AMOUNT_MAX.toLocaleString()}`
    };
  }

  return null;
}

export function sanitizeNumberInput(value: string): string {
  let sanitized = value.replace(/[^0-9.]/g, "");
  const parts = sanitized.split(".");
  if (parts.length > 2) {
    sanitized = parts[0] + "." + parts.slice(1).join("");
  }
  if (parts[1]) {
    sanitized = parts[0] + "." + parts[1].slice(0, VALIDATION_LIMITS.AMOUNT_DECIMAL_PLACES);
  }
  return sanitized;
}
```

**Expected outcome:**
- Consistent validation across forms
- Clear error messages guide users to fix issues
- Frontend validation prevents backend errors

---

### 2.4 Create Component Composition Patterns

**Files to create:**
- `packages/nextjs/components/ui/Card.tsx` (compound component pattern)
- `packages/nextjs/components/ui/Modal.tsx` (compound component pattern)

**Approach:**
Create reusable compound components to replace prop drilling:
```typescript
/**
 * Card compound component
 * Replaces components with 17+ props
 *
 * Usage:
 * <Card>
 *   <Card.Header icon={<Icon />}>Title</Card.Header>
 *   <Card.Body>Content</Card.Body>
 *   <Card.Footer>
 *     <Button>Action</Button>
 *   </Card.Footer>
 * </Card>
 */
```

**Expected outcome:**
- Reduce prop drilling from 17+ props to semantic composition
- Components are self-documenting through structure
- Easier to customize individual sections

---

## Phase 3: Component Decomposition

Break down god components into focused, single-responsibility pieces.

### 3.1 Decompose FriendBalancesList (627 lines -> ~150 lines)

**Current file:**
- `packages/nextjs/components/home/FriendBalancesList.tsx`

**New files to create:**
- `packages/nextjs/components/home/BalanceItem.tsx`
- `packages/nextjs/components/home/hooks/usePaymentRequestActions.ts`
- `packages/nextjs/components/home/hooks/useFriendBalanceState.ts`
- `packages/nextjs/components/shared/AnimatedRequestIcon.tsx`

**Approach:**

**Step 1:** Extract `AnimatedRequestIcon` to shared component

**Step 2:** Extract balance item rendering to `BalanceItem.tsx`:
```typescript
/**
 * Single friend balance item with payment request actions
 *
 * Responsibilities:
 * - Display friend's balance (owe/owed)
 * - Show payment request status
 * - Handle request creation/reminder
 */
interface BalanceItemProps {
  balance: FriendBalance;
  request?: PaymentRequest;
  onRequestAction: (friendWallet: string, action: "create" | "remind") => Promise<void>;
  isProcessing: boolean;
  isSuccess: boolean;
}
```

**Step 3:** Extract payment request business logic to `usePaymentRequestActions.ts`

**Step 4:** Refactor main component to orchestrator (~150 lines)

**Expected outcome:**
- Main component is scannable (<200 lines)
- Each piece has single responsibility
- Business logic is testable in isolation

---

### 3.2 Reduce POSFullScreen Props (17 -> ~5)

**File to modify:**
- `packages/nextjs/components/credits/POSFullScreen.tsx`

**Approach:**
Create context provider for shared POS state:
```typescript
const POSContext = createContext<POSContextValue | null>(null);

export function POSProvider({ children }: { children: React.ReactNode }) {
  // State management - contains all logic currently in POSFullScreen props
}

export function usePOS() {
  const context = useContext(POSContext);
  if (!context) throw new Error("usePOS must be used within POSProvider");
  return context;
}
```

**Expected outcome:**
- Props reduced from 17 to 0 (context provides everything)
- Parent doesn't need to know internal details
- Easier to add new POS features

---

### 3.3 Decompose StallTerminal Hardcoded Cards

**File to modify:**
- `packages/nextjs/components/stall/StallTerminal.tsx`

**Approach:**
Use compound component pattern:
```typescript
<StallTerminal>
  <StallTerminal.TapCard />
  <StallTerminal.AmountEntry />
  <StallTerminal.ProcessingCard />
  <StallTerminal.SuccessCard />
  <StallTerminal.ErrorCard />
</StallTerminal>
```

**Expected outcome:**
- Terminal components are composable
- Easy to customize per vendor without modifying StallTerminal
- Clear parent-child relationship in JSX

---

### 3.4 Extract Helper Functions from Complex Conditional Logic

**Files to modify:**
- `packages/nextjs/components/home/FriendBalancesList.tsx`
- `packages/nextjs/components/approve/ApprovalFlow.tsx`

**Approach:**
Extract nested ternaries into named helper functions:
```typescript
// Before: deeply nested ternary
className={`btn ${hasRequest ? "btn-outline" : balance > 0 ? "btn-primary" : "btn-ghost"}`}

// After: helper function
function getBalanceButtonStyle(hasRequest: boolean, balance: number): string {
  if (hasRequest) return "btn btn-outline";
  if (balance > 0) return "btn btn-primary";
  return "btn btn-ghost";
}
```

**Expected outcome:**
- Logic is named and self-documenting
- Easy to modify styling rules
- Testable in isolation

---

### 3.5 Remove Redundant Helper Functions

**File to modify:**
- `packages/nextjs/components/home/FriendBalancesList.tsx`

**Approach:**
Remove `hasRequestForFriend` which is just `!!getRequestForFriend`:
```typescript
// Before: two functions
const getRequestForFriend = (wallet: string) => requests.find(r => r.payer === wallet);
const hasRequestForFriend = (wallet: string) => !!getRequestForFriend(wallet);

// After: single function
const getRequestForFriend = (wallet: string) => requests.find(r => r.payer === wallet);
// Usage: if (getRequestForFriend(wallet)) { ... }
```

**Expected outcome:**
- Less code to maintain
- Single source of truth
- Clearer intent

---

## Phase 4: Consistency Pass

Final polish to ensure consistent patterns across the codebase.

### 4.1 Standardize View Mode Logic

**File to modify:**
- `packages/nextjs/components/credits/POSFullScreen.tsx`

**Approach:**
Replace ref-based directional animation tracking with explicit state machine:
```typescript
type ViewTransition = {
  from: POSMode;
  to: POSMode;
  direction: "forward" | "backward";
};

const TRANSITIONS: ViewTransition[] = [
  { from: "tap", to: "amount-entry", direction: "forward" },
  { from: "amount-entry", to: "processing", direction: "forward" },
  { from: "success", to: "tap", direction: "backward" },
  // ...
];
```

**Expected outcome:**
- All valid transitions are documented
- Direction is deterministic
- Easy to add new modes

---

### 4.2 Document Hidden Side Effects

**Files to modify:**
- `packages/nextjs/components/approve/ApprovalFlow.tsx`
- `packages/nextjs/components/register/RegisterChipForm.tsx`

**Approach:**
Make side effects explicit with logging and user feedback:
```typescript
// Before: silent fire-and-forget
fetch("/api/onboarding/finalize", { method: "POST" }).catch(console.error);

// After: explicit with feedback
async function finalizeOnboarding() {
  try {
    setIsFinalizing(true);
    await fetch("/api/onboarding/finalize", { method: "POST" });
    toast.success("Setup complete!");
  } catch (error) {
    console.error("Failed to finalize onboarding:", error);
  } finally {
    setIsFinalizing(false);
  }
}
```

For sessionStorage mutations:
```typescript
/**
 * Sets session flag to skip loading states on next page
 * This is read by /approve page to skip step animations
 */
function skipNextPageLoadingAnimations() {
  sessionStorage.setItem("skipLoadingStates", "true");
}
```

**Expected outcome:**
- Side effects are discoverable when reading code
- Failures don't silently break user experience
- Future maintainers understand cross-page effects

---

### 4.3 Create Onboarding State Machine Documentation

**File to create:**
- `docs/onboarding-flow.md`

**Approach:**
Create visual state machine diagram documenting all states and transitions.

**Expected outcome:**
- Complex logic is documented outside code
- Visual diagram helps new developers
- All edge cases are explicitly handled

---

### 4.4 Create Consistency Checklist

**File to create:**
- `docs/component-checklist.md`

**Approach:**
Document standards established through refactoring for future development.

**Expected outcome:**
- Consistent quality across new code
- Easy onboarding for new developers
- Self-enforcing standards

---

## Dependency Order

Some refactors must be done before others:

1. **Phase 1 before Phase 3** - Utilities must exist before components can use them
2. **Phase 2.1 (useWalletAddress) before Phase 3** - Components need auth hook before decomposition
3. **Phase 2.2 (state machine) before Phase 3.1** - FriendBalancesList refactor benefits from state machine pattern
4. **Phase 2.4 (compound components) before Phase 3.2-3.3** - POSFullScreen and StallTerminal need composition patterns

---

## File Structure After Refactoring

```
packages/nextjs/
├── components/
│   ├── home/
│   │   ├── FriendBalancesList.tsx          (~150 lines, orchestrator)
│   │   ├── BalanceItem.tsx                  (new, ~100 lines)
│   │   ├── hooks/
│   │   │   ├── usePaymentRequestActions.ts  (new, ~80 lines)
│   │   │   └── useFriendBalanceState.ts     (new, ~60 lines)
│   ├── shared/
│   │   └── AnimatedRequestIcon.tsx          (extracted, ~50 lines)
│   ├── ui/
│   │   ├── Card.tsx                         (new, compound component)
│   │   └── Modal.tsx                        (new, compound component)
│   ├── common/
│   │   └── LoadingStates.tsx                (new, standardized loaders)
├── hooks/
│   ├── useWalletAddress.ts                  (new, auth abstraction)
│   └── useStateMachine.ts                   (new, state management)
├── utils/
│   ├── validation.ts                        (new, input validation)
│   ├── errorFormatting.ts                   (new, error messages)
│   └── addressHelpers.ts                    (new, extracted utilities)
├── constants/
│   └── app.constants.ts                     (new, magic numbers & configs)
├── docs/
│   ├── onboarding-flow.md                   (new, state machine diagram)
│   └── component-checklist.md               (new, development standards)
```

---

## Success Metrics

After completing all phases:

### Quantitative
- Average component size: <300 lines (currently 627 max)
- Prop count: <10 per component (currently 17 max)
- State variables: <5 per component (currently scattered)

### Qualitative
- New developer can understand onboarding flow quickly
- Payment request logic is self-explanatory
- State machine visualizations exist for complex flows
- Error messages guide users to solutions
- Consistent patterns across all components

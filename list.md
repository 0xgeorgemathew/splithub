# Component Readability & Understandability Issues

## 1. Inconsistent Authentication Pattern

### File: `packages/nextjs/components/approve/ApprovalFlow.tsx`
**Problem:** Manually reconstructs wallet address from Privy user object. Same pattern duplicated in `AddExpenseForm.tsx`, `SettleFlow.tsx`, and others.
**Why it hurts:** Creates maintenance burden. Hard to ensure all components stay in sync when authentication logic changes.

---

## 2. Confusing Multi-Tap Flow Implementation

### File: `packages/nextjs/components/settle/hooks/useMultiSettleFlow.ts`
**Problem:** 50+ lines of inline comments debating implementation approach. Function requires TWO NFC taps but this critical requirement isn't exposed in the function signature or documentation.
**Why it hurts:** Future maintainers will be confused. Signs transaction with placeholder all-zero address which is a workaround that needs documentation.

---

## 3. Scattered State Management

### File: `packages/nextjs/components/approve/ApprovalFlow.tsx`
**Problem:** Four separate state variables for approval flow (`paymentsState`, `creditsState`, `txHash`, `isPending`). Invalid state combinations are possible.
**Why it hurts:** Hard to track all combinations. Should use single reducer with explicit state machine.

### File: `packages/nextjs/components/register/RegisterChipForm.tsx`
**Problem:** Similar fragmented state (`flowState`, `error`, `statusMessage`, `chipAddress`).
**Why it hurts:** Inconsistent states are possible (e.g., flowState="error" while error is empty string).

---

## 4. God Component Anti-Pattern

### File: `packages/nextjs/components/home/FriendBalancesList.tsx` (627 lines)
**Problem:** Single component responsible for: fetching wallet balance, displaying friend balances, payment request creation, reminders, settlement flow coordination, modal management, error handling, success animations, notification logic.
**Why it hurts:** Impossible to understand at a glance. Testing requires mocking 5+ different concerns.

### File: `packages/nextjs/components/home/FriendBalancesList.tsx` (lines 133-216)
**Problem:** 83-line function handling two different workflows (create new request vs send reminder).
**Why it hurts:** Two completely different user flows mixed together. Hard to test scenarios independently.

---

## 5. Undocumented Magic Numbers

### File: `packages/nextjs/components/approve/ApprovalFlow.tsx`
**Problem:** Hardcoded `DEFAULT_AMOUNT = "1000"` with no context.
**Why it hurts:** Why 1000? What units? Is this 1000 USDC or 1000 wei?

### File: `packages/nextjs/components/register/RegisterChipForm.tsx`
**Problem:** Mysterious delay `setTimeout(resolve, 300)` between chip taps.
**Why it hurts:** Why 300ms? Is this for UI feedback, NFC chip cooldown, or something else?

### File: `packages/nextjs/components/credits/POSFullScreen.tsx`
**Problem:** Multiple animation configs with different values but no explanation.
**Why it hurts:** When do I use which? Why different stiffness values?

---

## 6. Inconsistent Error Handling

### File: `packages/nextjs/components/approve/ApprovalFlow.tsx`
**Problem:** Complex nested ternary for error messages, duplicated for each approval type.
**Why it hurts:** Same logic copy-pasted. Should extract to `formatWalletError(err)` utility.

### File: `packages/nextjs/components/register/RegisterChipForm.tsx`
**Problem:** Generic catch-all error handling shows same message for all error types.
**Why it hurts:** User has no idea how to fix the problem (network timeout vs user rejection vs chip already registered).

---

## 7. Complex Onboarding State Logic

### File: `packages/nextjs/components/UserSyncWrapper.tsx`
**Problem:** Unclear onboarding decision tree with edge cases. What happens if `chip_address` exists but `chip_registration_status` is "pending"?
**Why it hurts:** Edge cases unclear. Should use explicit state machine with all transitions documented.

---

## 8. Prop Drilling Overload

### File: `packages/nextjs/components/credits/POSFullScreen.tsx`
**Problem:** Component accepts 17 props.
**Why it hurts:** Too many props is a code smell for missing abstraction. Parent must know about all internal details.

---

## 9. Inconsistent Naming

### File: `packages/nextjs/components/settle/hooks/useSettleFlow.ts`
**Problem:** Hook named `useSettleFlow` but returns `handleSettle`. Other hooks use `initiate` or `start`.
**Why it hurts:** Inconsistent verb usage across codebase.

### File: `packages/nextjs/components/expense/hooks/useExpenseForm.ts`
**Problem:** Returns `isValid` while other hooks use `canSubmit` or `hasErrors`.
**Why it hurts:** Scanning multiple files requires remembering different property names.

### File: `packages/nextjs/components/home/FriendBalancesList.tsx`
**Problem:** Two functions with overlapping behavior (`getRequestForFriend` and `hasRequestForFriend`).
**Why it hurts:** `hasRequestForFriend` is just `!!getRequestForFriend`. Why have both?

---

## 10. Hidden Side Effects

### File: `packages/nextjs/components/approve/ApprovalFlow.tsx`
**Problem:** Database update happens silently with no user feedback (fire and forget).
**Why it hurts:** If this fails, user thinks they're done but database shows incomplete.

### File: `packages/nextjs/components/register/RegisterChipForm.tsx`
**Problem:** SessionStorage mutation hidden in success flow (`skipLoadingStates`).
**Why it hurts:** Magic flag that affects other pages' behavior. Not obvious when reading other components.

---

## 11. Complex Conditional Rendering

### File: `packages/nextjs/components/home/FriendBalancesList.tsx`
**Problem:** Deeply nested ternaries in className.
**Why it hurts:** Hard to scan and modify.

### File: `packages/nextjs/components/approve/ApprovalFlow.tsx`
**Problem:** Approval card has 3-level nested ternary for styling.
**Why it hurts:** Pattern repeated for multiple cards. Should use helper function.

---

## 12. Missing Input Validation

### File: `packages/nextjs/components/expense/hooks/useExpenseForm.ts`
**Problem:** No upper bounds or format validation.
**Why it hurts:** User can enter $999,999,999, 10,000 character descriptions, or 100 friends. Backend will error with unhelpful message.

### File: `packages/nextjs/components/AddExpenseForm.tsx`
**Problem:** Uncontrolled number input allows negative numbers, scientific notation, excessive decimals.
**Why it hurts:** Leads to confusing errors.

---

## 13. Unclear View Mode Logic

### File: `packages/nextjs/components/credits/POSFullScreen.tsx`
**Problem:** Complex view derivation with directional animations based on previous state tracked in ref.
**Why it hurts:** Difficult to reason about. What if mode changes quickly? What if component re-mounts?

---

## 14. Inconsistent Loading States

### Files: `FriendBalancesList.tsx`, `FriendSelector.tsx`, and others
**Problem:** Different loading UI styles across the app (Sparkles, spinner, Loader2 icon).
**Why it hurts:** Inconsistent visual feedback. Creates unprofessional feel.

---

## 15. Tight Coupling

### File: `packages/nextjs/components/settle/SettleFlow.tsx`
**Problem:** Component hardcodes PaymentStatusIndicator integration.
**Why it hurts:** Can't test SettleFlow logic without PaymentStatusIndicator. Can't swap indicator for different UX.

### File: `packages/nextjs/components/stall/StallTerminal.tsx`
**Problem:** Card components hardcoded in phase switch.
**Why it hurts:** Can't customize cards without modifying StallTerminal.

---

## 16. Mixed Responsibilities in Components

### File: `packages/nextjs/components/TopNav.tsx`
**Problem:** UI component contains utility functions (`truncateAddress`, `copyToClipboard`) and business logic.
**Why it hurts:** Utility functions are used elsewhere but defined locally.

---

# Summary by Category

### Readability Issues (High Impact)
- Complex nested ternaries in className composition
- Magic numbers without explanation
- Inconsistent naming conventions
- Missing comments on complex state transitions

### Understandability Issues (High Impact)
- God components doing 5+ things
- Missing documentation on business logic (two-tap flow, onboarding states)
- Hidden side effects
- Complex conditional logic without helper functions

### Code Organization (Medium Impact)
- Duplicate authentication patterns across 10+ components
- Mixed state management approaches
- Components over 600 lines
- Missing abstraction layers

### Inconsistent Patterns (Medium Impact)
- Different error handling strategies per component
- Varying loading state implementations
- Mixed validation approaches

---

# Recommended Refactoring Priority

## High Priority (Blocks understanding)
1. Split `FriendBalancesList.tsx` into smaller components
2. Extract authentication pattern to `useWalletAddress()` hook
3. Document two-tap flow in `useMultiSettleFlow`
4. Create shared error handling utility
5. Standardize loading states

## Medium Priority (Improves maintainability)
6. Convert scattered state to state machines
7. Extract magic numbers to constants
8. Create shared validation hooks
9. Standardize naming conventions
10. Remove prop drilling with context

## Low Priority (Polish)
11. Consistent animation configurations
12. Shared utility functions
13. Compound component patterns

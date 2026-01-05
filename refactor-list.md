# Readability Refactoring List

## Major Issues

### 1. `/api/relay/payment/route.ts`
- **Lines:** 235
- **Problems:**
  - Deep nesting (3-4 levels) in circle auto-split logic (lines 147-201)
  - Mixed concerns: payment flow + circle splitting in same handler
  - Magic numbers: `24` (expiry hours), `6` (decimals), `10` (conversion factor)
  - Code duplicated with credit-purchase route

### 2. `/api/relay/credit-purchase/route.ts`
- **Lines:** 192
- **Problems:**
  - Near-identical circle auto-split logic (lines 116-174) to payment route
  - Deep nesting (3-4 levels of try/catch)
  - Magic number calculations for credit conversion (line 112)
  - Mixed concerns: credit purchase + expense creation

### 3. `/splits/page.tsx`
- **Lines:** 412
- **Problems:**
  - Very long handlers: `handleFriendClick` (27 lines), `handlePaymentRequestClick` (68 lines), `handleSettlement` (35 lines)
  - 7 state variables managing modals, loading, errors
  - Mixed UI state + API calls + business logic in event handlers
  - Complex conditional nesting in `handlePaymentRequestClick`

---

## Moderate Issues

### 4. `/settle/page.tsx`
- **Lines:** 386
- **Problems:**
  - `handleSettle` is 118 lines (lines 94-212)
  - Complex `FlowState` type with 7 states but logic spread throughout
  - Magic numbers: 3600 (deadline), 1000 (timeout delay)
  - Payment auth building + signing + submission all in one function

### 5. `/api/payment-requests/route.ts`
- **Lines:** 192
- **Problems:**
  - Long POST function: 113 lines handling validation, DB checks, insertion, notifications
  - Multiple responsibilities mixed together
  - Complex validation logic (lines 85-130)
  - GET function updates expired requests while fetching (side effect during read)

### 6. `/api/payment-requests/[id]/route.ts`
- **Lines:** 136
- **Problems:**
  - PATCH (lines 46-105) and POST (lines 107-135) nearly identical
  - Inconsistent patterns: PATCH validates more than POST for same operation
  - Mixed concerns: validation + status checks + DB updates all inline

### 7. `/settle/[requestId]/page.tsx`
- **Lines:** 263
- **Problems:**
  - Complex useEffect chain (lines 19-44)
  - `handleSuccess` does 3 different API calls (lines 47-78)
  - No error handling: failures logged but not surfaced to UI
  - Unclear state flow: Loading → Error → Non-pending → Valid states not clearly separated

### 8. `/events/page.tsx`
- **Lines:** 233
- **Problems:**
  - Repetitive loading states: same spinner + icon pattern repeated 3 times
  - Long component with multiple conditional renders
  - Unclear component responsibility: manages modals + dashboard state + event/stall creation

### 9. `/multi-settle/page.tsx`
- **Lines:** 211
- **Problems:**
  - Two different UIs in one component: Configuration UI vs Flow UI
  - Complex state management: 6 state variables for config + slot management
  - Slot management functions (lines 25-42) could be extracted
  - Validation scattered throughout component

### 10. `/request/create/page.tsx`
- **Lines:** 201
- **Problems:**
  - Long success handler mixes validation, API call, state updates
  - Uses `alert()` instead of UI error state (unprofessional)
  - Conditional render complexity: success state could be separate component

---

## Minor Issues

### 11. `/requests/page.tsx`
- **Problems:**
  - Repetitive badge logic: `getStatusBadge` returns JSX for each status
  - Date formatting inline (could be extracted to utility)
  - Map operations could be extracted to component

### 12. `/credits/page.tsx`
- **Problems:**
  - Callback overhead: 6 `useCallback` wrappers for simple setState calls
  - Conditional render: POS vs venue selection could be separate components

---

## Common Patterns Needing Refactoring

1. **Circle auto-split logic duplication** - appears in 2 relay routes
2. **Payment flow state machines** - settle, multi-settle pages
3. **Loading/error/empty state patterns** - repeated across all pages
4. **Fetch + error handling boilerplate** - every API call
5. **Modal state management** - splits, events pages
6. **Validation logic scattered** - throughout API routes and pages

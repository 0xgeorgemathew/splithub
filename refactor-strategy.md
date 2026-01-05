# Readability Refactoring Strategy

## Major Issues

### 1. `/api/relay/payment/route.ts` (235 → ~100 lines)

**Strategy A: Extract Circle Auto-Split Service**
- **New File:** `services/circleAutoSplitService.ts`
- **Extract:** Lines 147-201 (entire circle auto-split block)
- **Function:**
```typescript
export async function processCircleAutoSplit(params: {
  userWallet: string;
  amount: bigint;
  tokenAddress: string;
  decimals: number;
  description?: string;
}): Promise<CircleSplitResult | null>
```
- **Benefit:** Reduces route 57%, eliminates 3-4 level nesting, reusable across routes

**Strategy B: Create Token Constants**
- **Update:** `constants/tokens.ts`
- **Add:**
```typescript
export const TOKEN_DECIMALS = { USDC: 6, CREDIT: 18 } as const;
export const CREDIT_CONVERSION = { USDC_TO_CREDITS_RATIO: 10 } as const;
export const PAYMENT_REQUEST_EXPIRY = { HOURS: 24 } as const;
```
- **Benefit:** Eliminates all magic numbers

**Strategy C: Extract Error Mapping**
- **New File:** `utils/contractErrors.ts`
- **Extract:** Lines 218-230
- **Function:** `parseContractError(error: Error): string`

---

### 2. `/api/relay/credit-purchase/route.ts` (192 → ~130 lines)

**Strategy A: Use Shared Circle Service**
- Replace lines 116-174 with call to `processCircleAutoSplit()`
- **Benefit:** Eliminates 58 lines of duplicate code

**Strategy B: Extract Credit Calculation**
- **New File:** `utils/creditCalculations.ts`
- **Function:**
```typescript
export function calculateCreditsMinted(usdcAmount: bigint): bigint
```
- **Benefit:** Removes complex inline calculation, testable

---

### 3. `/splits/page.tsx` (412 → ~200 lines)

**Strategy A: Extract Payment Request Hook**
- **New File:** `hooks/usePaymentRequest.ts`
- **Extract:** Lines 60-137 (handlePaymentRequestClick logic)
- **Hook:**
```typescript
export function usePaymentRequest() {
  const createOrRemindRequest = async (friend, userWallet) => { ... };
  return { createOrRemindRequest, processingFriendWallet, successFriendWallet, error };
}
```
- **Benefit:** Removes 68 lines, consolidates 3 state variables

**Strategy B: Extract Settlement Hook**
- **New File:** `hooks/useSettlement.ts`
- **Extract:** Lines 139-209 (handleSettlement + handleSettlementSuccess)
- **Hook:**
```typescript
export function useSettlement() {
  const initiateSettlement = async (friend) => { ... };
  const handleSuccess = async (txHash) => { ... };
  return { params, isOpen, initiateSettlement, handleSuccess, close };
}
```
- **Benefit:** Removes 70 lines, consolidates 2 state variables

**Strategy C: Generic Modal State Hook**
- **New File:** `hooks/useModalState.ts`
- **Hook:** `function useModalState<T>() { return { isOpen, data, open, close }; }`
- **Benefit:** Reusable across all modals

---

## Moderate Issues

### 4. `/settle/page.tsx` (386 → ~150 lines)

**Strategy: Extract Payment Flow Hook**
- **New File:** `hooks/usePaymentFlow.ts`
- **Extract:** Entire handleSettle function + state machine logic
- **Hook:**
```typescript
export function usePaymentFlow() {
  const executePayment = async (params: PaymentParams) => { ... };
  return { flowState, error, txHash, executePayment, reset, paymentStatus, processingText };
}
```
- **Benefit:** Removes 118 lines, encapsulates complex FSM, reusable

---

### 5. `/api/payment-requests/route.ts` (192 → ~100 lines)

**Strategy A: Extract Validation Service**
- **New File:** `services/paymentRequestValidation.ts`
- **Functions:**
  - `validatePaymentRequest(body): ValidationResult`
  - `findExistingRequest(payer, recipient): Promise<ExistingRequest | null>`
- **Benefit:** Removes 35 lines, testable validation

**Strategy B: Extract Notification Service**
- **New File:** `services/notificationService.ts`
- **Function:** `sendPaymentRequestNotification(params): Promise<void>`
- **Benefit:** Removes 24 lines, isolates non-critical errors

---

### 6. `/api/payment-requests/[id]/route.ts` (136 → ~60 lines)

**Strategy: Extract Shared Update Logic**
- **New File:** `services/paymentRequestService.ts`
- **Function:**
```typescript
export async function completePaymentRequest(requestId: string, txHash: string): Promise<PaymentRequest>
```
- **Benefit:** Eliminates duplication between PATCH and POST, both become ~15 lines

---

### 7. `/settle/[requestId]/page.tsx` (263 → ~180 lines)

**Strategy A: Extend Payment Request Hook**
- **Extend:** `hooks/usePaymentRequest.ts`
- **Add:**
```typescript
export function usePaymentRequestById(requestId: string | null) {
  return { request, loading, error };
}
```
- **Benefit:** Removes 26 lines, eliminates useEffect chain

**Strategy B: Extract Settlement Completion Service**
- **New File:** `services/settlementService.ts`
- **Function:**
```typescript
export async function completeSettlementFlow(params: {
  requestId: string;
  request: PaymentRequest;
  txHash: string;
}): Promise<void>
```
- **Benefit:** Removes 34 lines, sequential flow documented

---

### 8. `/events/page.tsx` (233 → ~90 lines)

**Strategy: Extract Loading/Error Components**
- **New File:** `components/common/LoadingStates.tsx`
- **Components:**
  - `LoadingSpinner({ message })`
  - `AuthPrompt({ icon, message, onLogin })`
  - `ErrorDisplay({ error, onRetry })`
- **Benefit:** Removes 90+ lines, reusable across pages, consistent UX

---

### 9. `/multi-settle/page.tsx` (211 → ~20 + ~90 + ~60 lines)

**Strategy A: Split into Two Components**
- **New File:** `components/multi-settle/MultiSettleConfig.tsx` - Configuration UI
- **New File:** `components/multi-settle/MultiSettleExecution.tsx` - Execution UI
- **Benefit:** Separation of concerns, each under 100 lines

**Strategy B: Extract Form Hook**
- **New File:** `hooks/useMultiSettleForm.ts`
- **Manages:** recipient, token, memo, slots, validation, calculations
- **Benefit:** Removes form logic from component

**Page becomes:**
```typescript
export default function MultiSettlePage() {
  const [config, setConfig] = useState<MultiSettleParams | null>(null);
  if (config) return <MultiSettleExecution config={config} onBack={() => setConfig(null)} />;
  return <MultiSettleConfig onStart={setConfig} />;
}
```

---

### 10. `/request/create/page.tsx` (201 → ~120 lines)

**Strategy A: Create Toast Component**
- **New File:** `components/common/Toast.tsx`
- **Benefit:** Professional UI, replaces `alert()` calls

**Strategy B: Extract Request Creation Hook**
- **New File:** `hooks/useCreatePaymentRequest.ts`
- **Hook:**
```typescript
export function useCreatePaymentRequest() {
  const createRequest = async (params) => { ... };
  return { createRequest, isSubmitting, error, requestUrl, copyToClipboard };
}
```
- **Benefit:** Removes submission logic, proper error state

---

## New Files Summary

### Services (5)
- `services/circleAutoSplitService.ts`
- `services/paymentRequestValidation.ts`
- `services/notificationService.ts`
- `services/paymentRequestService.ts`
- `services/settlementService.ts`

### Hooks (6)
- `hooks/usePaymentRequest.ts`
- `hooks/useSettlement.ts`
- `hooks/useModalState.ts`
- `hooks/usePaymentFlow.ts`
- `hooks/useMultiSettleForm.ts`
- `hooks/useCreatePaymentRequest.ts`

### Utils (2)
- `utils/contractErrors.ts`
- `utils/creditCalculations.ts`

### Components (4)
- `components/common/LoadingStates.tsx`
- `components/common/Toast.tsx`
- `components/multi-settle/MultiSettleConfig.tsx`
- `components/multi-settle/MultiSettleExecution.tsx`

### Constants (1 update)
- `constants/tokens.ts` - add decimals, conversions, expiry

---

## Implementation Order

**Phase 1 - Foundation**
1. Update `constants/tokens.ts`
2. Create `utils/contractErrors.ts`
3. Create `utils/creditCalculations.ts`
4. Create `components/common/LoadingStates.tsx`
5. Create `components/common/Toast.tsx`

**Phase 2 - Services**
6. Create `services/circleAutoSplitService.ts`
7. Create `services/paymentRequestValidation.ts`
8. Create `services/notificationService.ts`
9. Create `services/paymentRequestService.ts`
10. Create `services/settlementService.ts`

**Phase 3 - Hooks**
11. Create `hooks/useModalState.ts`
12. Create `hooks/usePaymentRequest.ts`
13. Create `hooks/useSettlement.ts`
14. Create `hooks/usePaymentFlow.ts`
15. Create `hooks/useMultiSettleForm.ts`
16. Create `hooks/useCreatePaymentRequest.ts`

**Phase 4 - Refactor API Routes**
17. Refactor `/api/relay/payment/route.ts`
18. Refactor `/api/relay/credit-purchase/route.ts`
19. Refactor `/api/payment-requests/route.ts`
20. Refactor `/api/payment-requests/[id]/route.ts`

**Phase 5 - Refactor Pages**
21. Refactor `/splits/page.tsx`
22. Refactor `/settle/page.tsx`
23. Refactor `/settle/[requestId]/page.tsx`
24. Refactor `/events/page.tsx`
25. Refactor `/multi-settle/page.tsx`
26. Refactor `/request/create/page.tsx`

---

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Total lines in affected files | ~2,500 | ~1,000 |
| Average handler length | 68 lines | 15 lines |
| Magic numbers | 12+ | 0 |
| Duplicate code blocks | 5 | 0 |
| Reusable utilities | 0 | 17 |
| Max nesting depth | 4 | 2 |

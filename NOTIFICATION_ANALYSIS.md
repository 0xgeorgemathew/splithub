# SplitHub Push Notification System - Technical Analysis

**Date:** December 9, 2025
**Scope:** Complete audit of OneSignal push notification integration
**Status:** Analysis Only (No Code Modifications)

---

## 1. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                              NOTIFICATION LIFECYCLE                                |
+-----------------------------------------------------------------------------------+

                              SUBSCRIPTION FLOW
+-----------------------------------------------------------------------------+
|                                                                             |
|  [User Opens App]                                                           |
|        |                                                                    |
|        v                                                                    |
|  [OneSignalProvider.tsx]                                                    |
|  - Injects SDK script from cdn.onesignal.com                               |
|  - Calls OneSignal.init({ appId })                                          |
|        |                                                                    |
|        v                                                                    |
|  [EnableNotificationsButton.tsx]  <-- User clicks "Enable Notifications"   |
|        |                                                                    |
|        v                                                                    |
|  [Browser Permission Prompt]                                                |
|        |                                                                    |
|        +-- Denied --> [Banner Hidden, No Further Action]                   |
|        |                                                                    |
|        v (Granted)                                                          |
|  [OneSignal SDK]                                                            |
|  - Registers with OneSignal servers                                         |
|  - Generates subscription_id (player_id)                                    |
|  - Registers OneSignalSDKWorker.js service worker                          |
|        |                                                                    |
|        v                                                                    |
|  [OneSignalProvider.tsx - Subscription Change Listener]                     |
|  - Detects new subscription_id                                              |
|  - POSTs to /api/user/onesignal                                            |
|        |                                                                    |
|        v                                                                    |
|  [/api/user/onesignal/route.ts]                                            |
|  - Calls updateOneSignalPlayerId()                                          |
|        |                                                                    |
|        v                                                                    |
|  [Supabase: users.onesignal_player_id]                                      |
|  - Stores subscription_id against wallet_address                           |
|                                                                             |
+-----------------------------------------------------------------------------+

                          NOTIFICATION SEND FLOW
+-----------------------------------------------------------------------------+
|                                                                             |
|  [User Creates Payment Request]                                             |
|        |                                                                    |
|        v                                                                    |
|  [POST /api/payment-requests/route.ts]                                      |
|  - Creates payment_request record in Supabase                               |
|  - Calls getOneSignalPlayerId(payerWallet)                                  |
|        |                                                                    |
|        +-- No player_id --> [Skip notification, log warning]               |
|        |                                                                    |
|        v (player_id found)                                                  |
|  [sendPaymentRequestNotification()]                                         |
|  notificationService.ts                                                     |
|        |                                                                    |
|        v                                                                    |
|  [OneSignal REST API]                                                       |
|  POST https://onesignal.com/api/v1/notifications                           |
|  - include_subscription_ids: [playerId]                                     |
|  - headings, contents, web_url, data                                        |
|        |                                                                    |
|        v                                                                    |
|  [OneSignal Servers]                                                        |
|  - Validates subscription_id                                                |
|  - Routes to appropriate push service (FCM/APNs/Web Push)                  |
|        |                                                                    |
|        v                                                                    |
|  [Browser Service Worker: OneSignalSDKWorker.js]                           |
|  - Receives push event                                                      |
|  - Displays notification                                                    |
|        |                                                                    |
|        v                                                                    |
|  [User Clicks Notification]                                                 |
|        |                                                                    |
|        v                                                                    |
|  [OneSignalProvider.tsx - Click Handler]                                    |
|  - Reads additionalData.url or type                                         |
|  - Navigates to target URL (e.g., /settle/{requestId})                     |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## 2. File Inventory

### Core Notification Files

| # | File | Purpose | Dependencies | Flow Position |
|---|------|---------|--------------|---------------|
| 1 | `components/OneSignalProvider.tsx` | SDK initialization, subscription management, click handlers | `@privy-io/react-auth`, OneSignal SDK | Entry point, wraps entire app |
| 2 | `components/EnableNotificationsButton.tsx` | UI for requesting notification permission | `OneSignalProvider` types | User interaction layer |
| 3 | `services/notificationService.ts` | Server-side notification sending functions | Environment variables | API layer |
| 4 | `services/userService.ts` | Player ID CRUD operations | `lib/supabase` | Data access layer |
| 5 | `public/OneSignalSDKWorker.js` | Service worker for push reception | OneSignal SDK CDN | Browser service worker |
| 6 | `app/api/user/onesignal/route.ts` | REST endpoint for saving/clearing player IDs | `userService` | API endpoint |
| 7 | `app/api/debug/test-notification/route.ts` | Debug endpoint for testing notifications | `userService`, `notificationService` | Debug tooling |
| 8 | `app/debug/notifications/page.tsx` | Debug UI for subscription diagnostics | `OneSignalProvider`, API routes | Debug tooling |

### Related Files (Notification Consumers)

| # | File | Purpose | Notification Usage |
|---|------|---------|-------------------|
| 9 | `app/api/payment-requests/route.ts` | Creates payment requests | Sends `sendPaymentRequestNotification` |
| 10 | `app/api/relay/payment/route.ts` | Executes payments | **NO NOTIFICATION** (gap identified) |
| 11 | `app/api/relay/batch-payment/route.ts` | Batch payment execution | **NO NOTIFICATION** (gap identified) |
| 12 | `app/splits/page.tsx` | Balances dashboard | Renders `EnableNotificationsButton` |
| 13 | `app/requests/page.tsx` | Payment requests list | Renders `EnableNotificationsButton` |
| 14 | `app/settle/[requestId]/page.tsx` | Individual payment page | Renders `EnableNotificationsButton` |
| 15 | `app/layout.tsx` | Root layout | Wraps app in `OneSignalProvider` |

### Configuration Files

| # | File | Purpose |
|---|------|---------|
| 16 | `lib/supabase.ts` | User type definition with `onesignal_player_id` field |
| 17 | `.env.example` | Documents required env vars |
| 18 | `package.json` | Lists `react-onesignal` dependency (UNUSED) |
| 19 | `public/manifest.json` | PWA manifest (no push-specific config) |
| 20 | `next.config.ts` | PWA configuration via `@ducanh2912/next-pwa` |

### Generated Files (Build Artifacts)

| # | File | Purpose |
|---|------|---------|
| 21 | `public/sw.js` | PWA service worker (generated by next-pwa) |
| 22 | `public/workbox-*.js` | Workbox caching library (generated) |

---

## 3. Detailed Component Analysis

### 3.1 OneSignalProvider.tsx

**Responsibilities:**
1. Dynamically injects OneSignal SDK v16 script
2. Initializes OneSignal with app ID
3. Listens for subscription changes
4. Persists subscription ID to database
5. Handles notification click events for deep linking

**Key Observations:**
- Uses `window.OneSignalDeferred` pattern (correct for v16)
- Tracks `lastSavedSubscriptionId` to prevent redundant API calls
- Click handler supports multiple navigation patterns (`url`, `type` + `requestId`)
- No service worker path configuration (relies on default `/OneSignalSDKWorker.js`)

**Potential Issues:**
- Re-initialization guard (`initialized.current`) may not work across hot reloads
- Subscription listener registered inside `window.OneSignalDeferred.push()` may be called multiple times

### 3.2 EnableNotificationsButton.tsx

**Responsibilities:**
1. Checks current permission and subscription state
2. Shows/hides banner based on subscription status
3. Handles permission request flow
4. Distinguishes between first-time subscribe and re-subscribe scenarios

**Key Observations:**
- Banner appears if `!hasSubscription` (even if permission was previously granted)
- Correctly identifies "stale subscription" scenario
- Does NOT directly save player ID (relies on provider's listener)
- Dismissible via X button (no persistence of dismissal state)

**Potential Issues:**
- `setIsRequesting(false)` called outside the deferred callback, may complete before actual permission flow finishes
- No feedback if permission was denied by browser

### 3.3 notificationService.ts

**Responsibilities:**
1. Sends payment request notifications
2. Sends payment completed notifications
3. Constructs OneSignal API payloads

**Key Observations:**
- Uses `include_subscription_ids` (correct for v16, replaces deprecated `include_player_ids`)
- Uses `web_url` only (correct - not mixing with `url`)
- Both functions have identical structure (DRY opportunity)
- Returns `boolean` indicating success/failure

**Critical Gap:**
- `sendPaymentCompletedNotification` is **defined but NEVER called** anywhere in codebase

### 3.4 userService.ts

**Responsibilities:**
1. `updateOneSignalPlayerId()` - saves subscription ID to user record
2. `getOneSignalPlayerId()` - retrieves subscription ID for sending notifications

**Key Observations:**
- Uses lowercase wallet addresses (consistent)
- Supports `null` parameter to clear subscription ID
- No multi-device support (single `onesignal_player_id` field)

### 3.5 OneSignalSDKWorker.js

**Content:**
```javascript
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
```

**Key Observations:**
- Minimal implementation (correct - delegates to OneSignal)
- Located at root of public folder (correct scope)
- No custom push event handlers

### 3.6 API Routes

**POST /api/user/onesignal:**
- Saves player ID with wallet address
- No authentication (relies on client providing correct wallet)

**DELETE /api/user/onesignal:**
- Clears player ID for debugging stale subscriptions

**GET /api/debug/test-notification:**
- Comprehensive debug endpoint
- Returns detailed diagnostics including payload sent and response received

---

## 4. Player ID Lifecycle

### Generation
1. User clicks "Enable Notifications" button
2. `OneSignal.Notifications.requestPermission()` called
3. Browser shows permission prompt
4. On grant, OneSignal SDK generates unique subscription ID
5. SDK registers service worker if not already registered

### Retrieval
1. `OneSignal.User.PushSubscription.id` accessed in provider
2. Subscription change listener fires on new/changed ID
3. Also checked on initial load when user is authenticated

### Persistence
1. Provider calls `POST /api/user/onesignal`
2. `updateOneSignalPlayerId()` updates `users.onesignal_player_id` in Supabase
3. Single value per user (overwrites previous)

### Association
- Linked by `wallet_address` (primary key of users table)
- No linking to Privy user ID directly
- No device/browser identifier stored

---

## 5. Gap Analysis & Issue List

### CRITICAL Issues

| # | Issue | Impact | File(s) |
|---|-------|--------|---------|
| C1 | **Payment completion notifications not implemented** | Recipients never know when they've been paid | `app/api/relay/payment/route.ts`, `notificationService.ts` |
| C2 | **Circle auto-split creates payment requests without notifications** | Circle members don't get notified of their share | `app/api/relay/payment/route.ts:199-228` |
| C3 | **Single player ID per user (no multi-device support)** | Only last registered device receives notifications | `lib/supabase.ts`, `userService.ts` |

### IMPORTANT Issues

| # | Issue | Impact | File(s) |
|---|-------|--------|---------|
| I1 | **No authentication on player ID save endpoint** | Any client can overwrite any user's subscription | `app/api/user/onesignal/route.ts` |
| I2 | **No retry mechanism for failed subscription saves** | Lost subscriptions if network fails during save | `OneSignalProvider.tsx:102-124` |
| I3 | **Unused `react-onesignal` npm package** | Unnecessary dependency, potential security surface | `package.json` |
| I4 | **Banner dismissal not persisted** | Banner reappears on every page load | `EnableNotificationsButton.tsx` |
| I5 | **Permission denied state not handled in UI** | User gets no feedback if they deny permission | `EnableNotificationsButton.tsx:31-45` |
| I6 | **Batch payments don't send notifications** | Multiple payments processed without any notifications | `app/api/relay/batch-payment/route.ts` |

### NICE TO HAVE Issues

| # | Issue | Impact | File(s) |
|---|-------|--------|---------|
| N1 | **No notification queuing for users without subscriptions** | Notifications permanently lost if user hasn't subscribed yet | `app/api/payment-requests/route.ts:159-173` |
| N2 | **No automatic stale subscription cleanup** | Manual debug intervention required | Debug page only |
| N3 | **Two separate service workers** | Potential caching/scope confusion | `sw.js`, `OneSignalSDKWorker.js` |
| N4 | **No notification delivery tracking/analytics** | Can't measure notification effectiveness | N/A |
| N5 | **Duplicate code in notificationService.ts** | Maintenance burden | `notificationService.ts` |
| N6 | **Click handler doesn't handle unknown notification types** | Silent failures for new notification types | `OneSignalProvider.tsx:65-79` |

---

## 6. Recommendations Plan

### CRITICAL Fixes

#### C1: Implement Payment Completion Notifications

**What to fix:** Add notification sending when payments are successfully executed.

**Why:** Users need to know when someone has paid them - this is core functionality.

**Files involved:**
- `app/api/relay/payment/route.ts` - Add notification call after successful tx
- `notificationService.ts` - Already has `sendPaymentCompletedNotification` (unused)
- `userService.ts` - Use `getOneSignalPlayerId` to get recipient's subscription

**Expected outcome:** Recipients receive push notification: "@{payer} paid you ${amount}"

---

#### C2: Add Notifications for Circle Auto-Split

**What to fix:** Send notifications to Circle members when payment requests are created for them.

**Why:** Circle members have no idea they owe money until they manually check the app.

**Files involved:**
- `app/api/relay/payment/route.ts:199-228` - Add notification loop after creating payment requests

**Expected outcome:** Each Circle member receives: "Circle split: {circleName} - You owe ${amount}"

---

#### C3: Implement Multi-Device Support

**What to fix:** Store multiple subscription IDs per user, send to all registered devices.

**Why:** Users may have multiple devices (phone, desktop) and expect notifications on all.

**Files involved:**
- `lib/supabase.ts` - Add new table `user_push_subscriptions` with columns: `id`, `wallet_address`, `subscription_id`, `device_name`, `created_at`, `last_active`
- `userService.ts` - New functions: `addPushSubscription()`, `removePushSubscription()`, `getAllPushSubscriptions()`
- `notificationService.ts` - Modify to accept array of subscription IDs
- `OneSignalProvider.tsx` - Store device identifier with subscription
- `app/api/user/onesignal/route.ts` - Update to add/remove subscriptions (not replace)

**Expected outcome:** Notifications delivered to all user's registered devices.

---

### IMPORTANT Fixes

#### I1: Add Authentication to Player ID Endpoint

**What to fix:** Verify that the authenticated user owns the wallet address.

**Why:** Currently any client can overwrite any user's subscription ID.

**Files involved:**
- `app/api/user/onesignal/route.ts` - Add Privy authentication check

**Expected outcome:** Only authenticated users can modify their own subscription.

---

#### I2: Add Retry Mechanism for Subscription Saves

**What to fix:** Implement retry with exponential backoff for failed saves.

**Why:** Network failures during save result in permanently lost subscriptions.

**Files involved:**
- `OneSignalProvider.tsx:102-124` - Wrap fetch in retry utility

**Expected outcome:** Transient failures don't result in lost subscriptions.

---

#### I3: Remove Unused react-onesignal Package

**What to fix:** Remove `react-onesignal` from `package.json`.

**Why:** Unused dependency increases bundle size and potential security surface.

**Files involved:**
- `package.json` - Remove dependency
- `yarn.lock` - Will update automatically

**Expected outcome:** Cleaner dependency tree.

---

#### I4: Persist Banner Dismissal State

**What to fix:** Store dismissal in localStorage, show banner again after reasonable interval.

**Why:** Repeated banner on every page load is poor UX.

**Files involved:**
- `EnableNotificationsButton.tsx` - Add localStorage check/write

**Expected outcome:** Banner respects user's dismissal for configurable period (e.g., 7 days).

---

#### I5: Handle Permission Denied State

**What to fix:** Show appropriate feedback when user denies notification permission.

**Why:** Users get no indication of what happened if they deny.

**Files involved:**
- `EnableNotificationsButton.tsx` - Check permission state after request

**Expected outcome:** Show "Notifications blocked" message with instructions to enable in browser settings.

---

#### I6: Add Notifications for Batch Payments

**What to fix:** Send notifications for each payment in a batch.

**Why:** Batch payments should notify recipients just like single payments.

**Files involved:**
- `app/api/relay/batch-payment/route.ts` - Add notification loop after successful batch

**Expected outcome:** Each recipient in batch receives payment notification.

---

### NICE TO HAVE Improvements

#### N1: Implement Notification Queuing

**What to fix:** Store notifications in database when user has no subscription, send when they subscribe.

**Files involved:**
- New table: `pending_notifications`
- `notificationService.ts` - Queue instead of skip
- `OneSignalProvider.tsx` - Trigger queue flush on new subscription

---

#### N2: Automatic Stale Subscription Cleanup

**What to fix:** Periodically verify subscriptions with OneSignal API, remove invalid ones.

**Files involved:**
- New cron job or scheduled function
- `userService.ts` - Bulk cleanup function

---

#### N3: Consolidate Service Workers

**What to fix:** Merge PWA and OneSignal service worker functionality or ensure proper scope isolation.

**Files involved:**
- `next.config.ts` - Configure PWA to exclude OneSignal worker
- Potentially custom combined worker

---

#### N4: Add Notification Analytics

**What to fix:** Track delivery, open, click rates.

**Files involved:**
- OneSignal dashboard (external)
- Potentially custom analytics table

---

#### N5: Refactor notificationService.ts

**What to fix:** Extract common logic into helper function.

**Files involved:**
- `notificationService.ts` - Create `sendNotification()` base function

---

#### N6: Add Default Click Handler

**What to fix:** Navigate to default location for unrecognized notification types.

**Files involved:**
- `OneSignalProvider.tsx:65-79` - Add else clause

---

## 7. Environment Variables Reference

| Variable | Scope | Purpose | Required |
|----------|-------|---------|----------|
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | Client + Server | OneSignal application identifier | Yes |
| `ONESIGNAL_REST_API_KEY` | Server only | API key for sending notifications | Yes |
| `NEXT_PUBLIC_APP_URL` | Server | Base URL for notification deep links | Recommended |

---

## 8. OneSignal SDK Version

- **Version:** v16 (Web Push SDK)
- **CDN URLs:**
  - Page script: `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js`
  - Service worker: `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js`
- **API Version:** v1 (`https://onesignal.com/api/v1/notifications`)

---

## 9. Database Schema

### Current: users table
```sql
onesignal_player_id VARCHAR(255) NULL
```

### Recommended: user_push_subscriptions table
```sql
CREATE TABLE user_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
  subscription_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_address, subscription_id)
);

CREATE INDEX idx_push_subs_wallet ON user_push_subscriptions(wallet_address);
```

---

## 10. Summary

The current implementation provides basic push notification functionality for payment requests but has several critical gaps:

1. **Incomplete notification coverage** - Payment completions and Circle splits don't trigger notifications
2. **Single-device limitation** - Only one device per user can receive notifications
3. **Security gap** - No authentication on subscription save endpoint
4. **Poor error handling** - No retry mechanisms, silent failures

The recommended fixes are prioritized to address user-facing functionality first (payment completion notifications), then security (authentication), then UX improvements (multi-device, error handling).

---

*Analysis completed: December 9, 2025*

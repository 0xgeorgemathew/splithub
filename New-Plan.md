# OneSignal Push Notification Integration Plan

## Overview

Integrate OneSignal web push notifications to alert users when:
1. **Payment Request Received** - Someone requests payment from them
2. **Payment Completed** - Their payment request has been paid
3. **Request Expiring Soon** - Reminder before 24-hour expiration (optional)

---

## Current State

### Existing Notification System
- **Badge counter** on "Requests" nav item (polls every 30 seconds)
- **Window events** (`refreshPaymentRequests`, `refreshBalances`) for UI updates
- **No push notifications** - users must open the app to see requests

### Key Integration Points
| Trigger | Location | Action |
|---------|----------|--------|
| Request created | `POST /api/payment-requests` | Notify payer |
| Payment completed | `POST /api/payment-requests/[id]` | Notify recipient |
| Request created from splits | `FriendBalancesList.tsx` | Notify payer |

---

## Implementation Plan

### Phase 1: OneSignal Setup

#### 1.1 Create OneSignal App
- Create account at [onesignal.com](https://onesignal.com)
- Create new app for SplitHub
- Configure Web Push platform:
  - Site URL: `https://splithub.app` (production) + localhost for dev
  - Default notification icon
  - Notification permission prompt settings

#### 1.2 Install Dependencies
```bash
yarn add @onesignal/onesignal-node  # Server SDK for sending
yarn add react-onesignal            # React SDK for subscribing
```

#### 1.3 Environment Variables
Add to `.env.local`:
```env
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key
```

---

### Phase 2: Service Worker Setup

#### 2.1 Create OneSignal Service Worker
Create `packages/nextjs/public/OneSignalSDKWorker.js`:
```javascript
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
```

#### 2.2 Update Next.js Config
Ensure service worker is served correctly in `next.config.mjs`:
```javascript
// Add headers for service worker scope if needed
async headers() {
  return [
    {
      source: '/OneSignalSDKWorker.js',
      headers: [
        { key: 'Service-Worker-Allowed', value: '/' }
      ]
    }
  ]
}
```

---

### Phase 3: Client-Side Integration

#### 3.1 Create OneSignal Provider
Create `packages/nextjs/components/OneSignalProvider.tsx`:
```typescript
"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";
import { useAccount } from "wagmi";

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();

  useEffect(() => {
    OneSignal.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      allowLocalhostAsSecureOrigin: true, // For development
      notifyButton: { enable: false }, // We'll use custom prompts
    });
  }, []);

  // Link wallet address to OneSignal user when connected
  useEffect(() => {
    if (address) {
      OneSignal.login(address.toLowerCase());
      OneSignal.User.addTag("wallet", address.toLowerCase());
    }
  }, [address]);

  return <>{children}</>;
}
```

#### 3.2 Add Provider to Layout
Update `packages/nextjs/app/layout.tsx`:
```typescript
import { OneSignalProvider } from "~~/components/OneSignalProvider";

// Wrap children with OneSignalProvider
<OneSignalProvider>
  {children}
</OneSignalProvider>
```

#### 3.3 Create Permission Prompt Component
Create `packages/nextjs/components/NotificationPrompt.tsx`:
```typescript
"use client";

import { useState, useEffect } from "react";
import OneSignal from "react-onesignal";
import { BellIcon } from "@heroicons/react/24/outline";

export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<string>("default");

  useEffect(() => {
    const checkPermission = async () => {
      const perm = await OneSignal.Notifications.permission;
      setPermission(perm ? "granted" : "default");
      // Show prompt if not granted and not denied
      if (!perm && Notification.permission !== "denied") {
        setShowPrompt(true);
      }
    };
    checkPermission();
  }, []);

  const requestPermission = async () => {
    await OneSignal.Notifications.requestPermission();
    setShowPrompt(false);
  };

  if (!showPrompt || permission === "granted") return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-base-200 rounded-xl p-4 shadow-lg border border-base-300">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <BellIcon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Enable Notifications</h3>
          <p className="text-sm text-base-content/70">
            Get notified when friends request payments
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setShowPrompt(false)}
          className="btn btn-ghost btn-sm flex-1"
        >
          Not now
        </button>
        <button
          onClick={requestPermission}
          className="btn btn-primary btn-sm flex-1"
        >
          Enable
        </button>
      </div>
    </div>
  );
}
```

#### 3.4 Add Prompt to Splits Page
Update `packages/nextjs/app/splits/page.tsx` to show the prompt after user has used the app:
```typescript
import { NotificationPrompt } from "~~/components/NotificationPrompt";

// Add at bottom of page
<NotificationPrompt />
```

---

### Phase 4: Server-Side Notification Sending

#### 4.1 Create OneSignal Service
Create `packages/nextjs/services/onesignal.ts`:
```typescript
import * as OneSignal from "@onesignal/onesignal-node";

const client = new OneSignal.DefaultApi();

client.setConfiguration({
  appKey: process.env.ONESIGNAL_REST_API_KEY!,
});

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;

export type NotificationType =
  | "payment_request"
  | "payment_completed"
  | "request_expiring";

interface SendNotificationParams {
  walletAddress: string;
  type: NotificationType;
  title: string;
  message: string;
  url?: string;
  data?: Record<string, string>;
}

export async function sendPushNotification({
  walletAddress,
  type,
  title,
  message,
  url,
  data = {},
}: SendNotificationParams) {
  try {
    const notification = new OneSignal.Notification();
    notification.app_id = APP_ID;

    // Target by external user ID (wallet address)
    notification.include_aliases = {
      external_id: [walletAddress.toLowerCase()],
    };
    notification.target_channel = "push";

    notification.headings = { en: title };
    notification.contents = { en: message };

    if (url) {
      notification.url = url;
    }

    notification.data = {
      type,
      ...data,
    };

    // Web push specific
    notification.web_push_topic = type;

    const response = await client.createNotification(notification);
    console.log("Push notification sent:", response);
    return { success: true, id: response.id };
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return { success: false, error };
  }
}

// Convenience functions for specific notification types
export async function notifyPaymentRequest(
  payerWallet: string,
  requesterName: string,
  amount: string,
  requestId: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splithub.app";

  return sendPushNotification({
    walletAddress: payerWallet,
    type: "payment_request",
    title: "Payment Request",
    message: `${requesterName} requested $${amount} USDC`,
    url: `${baseUrl}/settle/${requestId}`,
    data: { requestId, amount },
  });
}

export async function notifyPaymentCompleted(
  recipientWallet: string,
  payerName: string,
  amount: string,
  txHash: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splithub.app";

  return sendPushNotification({
    walletAddress: recipientWallet,
    type: "payment_completed",
    title: "Payment Received!",
    message: `${payerName} paid you $${amount} USDC`,
    url: `${baseUrl}/splits`,
    data: { txHash, amount },
  });
}
```

#### 4.2 Integrate with Payment Request Creation
Update `packages/nextjs/app/api/payment-requests/route.ts`:

```typescript
import { notifyPaymentRequest } from "~~/services/onesignal";

// In POST handler, after successfully creating request:

// Fetch requester's name for notification
const { data: requesterUser } = await supabase
  .from("users")
  .select("name, twitter_handle")
  .eq("wallet_address", recipient)
  .single();

const requesterName = requesterUser?.name ||
  requesterUser?.twitter_handle ||
  `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;

// Send push notification to payer
await notifyPaymentRequest(
  payer,
  requesterName,
  amount,
  paymentRequest.id
);
```

#### 4.3 Integrate with Payment Completion
Update `packages/nextjs/app/api/payment-requests/[id]/route.ts`:

```typescript
import { notifyPaymentCompleted } from "~~/services/onesignal";

// In PATCH/POST handler, after marking as completed:

// Fetch payer's name for notification
const { data: payerUser } = await supabase
  .from("users")
  .select("name, twitter_handle")
  .eq("wallet_address", request.payer)
  .single();

const payerName = payerUser?.name ||
  payerUser?.twitter_handle ||
  `${request.payer.slice(0, 6)}...${request.payer.slice(-4)}`;

// Send push notification to recipient
await notifyPaymentCompleted(
  request.recipient,
  payerName,
  request.amount,
  txHash
);
```

---

### Phase 5: Database Schema Updates

#### 5.1 Add Notification Preferences Table
Create migration `packages/nextjs/supabase/migrations/XXX_create_notification_preferences.sql`:
```sql
CREATE TABLE notification_preferences (
  wallet_address TEXT PRIMARY KEY,
  push_enabled BOOLEAN DEFAULT true,
  payment_requests BOOLEAN DEFAULT true,
  payment_completed BOOLEAN DEFAULT true,
  request_reminders BOOLEAN DEFAULT true,
  onesignal_player_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_preferences_player_id
  ON notification_preferences(onesignal_player_id);
```

#### 5.2 Create Preferences API
Create `packages/nextjs/app/api/notification-preferences/route.ts`:
```typescript
// GET - Fetch user's notification preferences
// PATCH - Update preferences
// POST - Save OneSignal player ID
```

---

### Phase 6: Settings Page Integration

#### 6.1 Add Notification Settings Component
Create `packages/nextjs/components/settings/NotificationSettings.tsx`:
```typescript
"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { BellIcon, BellSlashIcon } from "@heroicons/react/24/outline";
import OneSignal from "react-onesignal";

export function NotificationSettings() {
  const { address } = useAccount();
  const [enabled, setEnabled] = useState(false);
  const [preferences, setPreferences] = useState({
    payment_requests: true,
    payment_completed: true,
    request_reminders: true,
  });

  // Load current preferences
  useEffect(() => {
    if (!address) return;
    fetch(`/api/notification-preferences?wallet=${address}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setPreferences(data);
          setEnabled(data.push_enabled);
        }
      });
  }, [address]);

  const togglePush = async () => {
    if (!enabled) {
      await OneSignal.Notifications.requestPermission();
    }
    // Update preference in database
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Push Notifications</h3>
      {/* Toggle switches for each notification type */}
    </div>
  );
}
```

---

## File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add OneSignal dependencies |
| `.env.local` | Modify | Add OneSignal credentials |
| `public/OneSignalSDKWorker.js` | Create | Service worker for push |
| `next.config.mjs` | Modify | Service worker headers |
| `components/OneSignalProvider.tsx` | Create | Initialize OneSignal client |
| `components/NotificationPrompt.tsx` | Create | Permission request UI |
| `services/onesignal.ts` | Create | Server-side notification sending |
| `app/layout.tsx` | Modify | Add OneSignalProvider |
| `app/splits/page.tsx` | Modify | Add notification prompt |
| `app/api/payment-requests/route.ts` | Modify | Send notification on request creation |
| `app/api/payment-requests/[id]/route.ts` | Modify | Send notification on completion |
| `supabase/migrations/XXX_notification_preferences.sql` | Create | Preferences table |
| `app/api/notification-preferences/route.ts` | Create | Preferences CRUD API |
| `components/settings/NotificationSettings.tsx` | Create | Settings UI |

---

## Testing Checklist

- [ ] OneSignal SDK initializes without errors
- [ ] Service worker registers successfully
- [ ] Permission prompt appears for new users
- [ ] Wallet address linked to OneSignal on connect
- [ ] Payment request triggers push to payer
- [ ] Payment completion triggers push to recipient
- [ ] Clicking notification opens correct page
- [ ] Notifications respect user preferences
- [ ] Works in both development and production

---

## Security Considerations

1. **API Key Protection** - REST API key is server-side only (`ONESIGNAL_REST_API_KEY`)
2. **Wallet Verification** - Only send to verified wallet addresses from database
3. **Rate Limiting** - Consider adding rate limits to prevent notification spam
4. **Unsubscribe** - Users can disable via settings or browser

---

## Future Enhancements

1. **Expiration Reminders** - Cron job to notify before 24-hour expiration
2. **Rich Notifications** - Include profile pictures in notifications
3. **Action Buttons** - "Pay Now" button directly in notification
4. **Email Fallback** - Send email if push fails (requires email collection)
5. **In-App Notifications** - Real-time toast using Supabase Realtime

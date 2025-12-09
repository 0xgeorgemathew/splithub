# OneSignal Integration Plan for Payment Request Notifications

## Overview

Integrate OneSignal to send push notifications when a user receives a payment request. Using OneSignal's **User Model with Aliases**, we target users by wallet address directly - **no database changes needed**.

**Key Insight**: OneSignal's new User Model eliminates the need to store `player_id` in our database. Instead, we use `OneSignal.login(walletAddress)` to link devices to wallet addresses. OneSignal handles multi-device support automatically.

---

## Implementation Steps

### 1. Install OneSignal SDK

```bash
yarn add react-onesignal
```

### 2. Create OneSignal Service Worker

Create `packages/nextjs/public/OneSignalSDKWorker.js`:

```javascript
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
```

**Critical**: Update `next.config.ts` to prevent `@ducanh2912/next-pwa` from conflicting:

```typescript
module.exports = withPWA({
  dest: "public",
  publicExcludes: ["!OneSignalSDKWorker.js"],
})(nextConfig);
```

### 3. Initialize OneSignal with Identity (Login)

Create `packages/nextjs/lib/onesignal.ts`:

```typescript
import OneSignal from "react-onesignal";

let initialized = false;

export const initOneSignal = async () => {
  if (initialized || typeof window === "undefined") return;

  await OneSignal.init({
    appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
    allowLocalhostAsSecureOrigin: true,
  });
  initialized = true;
};

// Call when user connects wallet (after Privy auth)
// This links the device to the wallet address
export const loginOneSignal = (walletAddress: string) => {
  OneSignal.login(walletAddress.toLowerCase());
};

// Call when user disconnects wallet
export const logoutOneSignal = () => {
  OneSignal.logout();
};

// Request push permission (call from UI button)
export const requestNotificationPermission = async (): Promise<boolean> => {
  const permission = await OneSignal.Notifications.requestPermission();
  return permission;
};

// Check current permission state
export const getNotificationPermission = (): boolean => {
  return OneSignal.Notifications.permission;
};
```

Create `packages/nextjs/components/OneSignalProvider.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  initOneSignal,
  loginOneSignal,
  logoutOneSignal,
} from "~/lib/onesignal";

export const OneSignalProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { ready, authenticated, user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const [sdkReady, setSdkReady] = useState(false);

  // Initialize OneSignal SDK first
  useEffect(() => {
    const init = async () => {
      await initOneSignal();
      setSdkReady(true);
    };
    init();
  }, []);

  // Only call login/logout after SDK is ready
  useEffect(() => {
    if (!sdkReady || !ready) return;

    if (authenticated && walletAddress) {
      loginOneSignal(walletAddress);
    } else {
      logoutOneSignal();
    }
  }, [sdkReady, ready, authenticated, walletAddress]);

  return <>{children}</>;
};
```

> **Note**: The `sdkReady` state prevents race conditions where `login()` could be called before the SDK finishes initializing.

### 4. Create Notification Toggle UI

Create `packages/nextjs/components/NotificationToggle.tsx`:

- Show current notification state (enabled/disabled/denied)
- Button to request permission
- Handle browser permission denied state gracefully

Location: Replace debug notifications link in TopNav dropdown

### 5. Create Notification API Endpoint

Create `packages/nextjs/app/api/notifications/send/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { recipientWallet, title, message, url } = await request.json();

    if (!recipientWallet || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        include_aliases: {
          external_id: [recipientWallet.toLowerCase()],
        },
        target_channel: "push",
        headings: { en: title },
        contents: { en: message },
        url: url || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OneSignal API error:", data);
      return NextResponse.json(
        { error: "Failed to send notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Notification send error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 6. Integrate with Payment Request Creation

Modify `packages/nextjs/app/api/payment-requests/route.ts` POST handler:

```typescript
// After successful insert, send notification (fire and forget)
try {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splithub.space";
  await fetch(`${baseUrl}/api/notifications/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipientWallet: payerLower,
      title: `Payment Request from @${requesterTwitter || "someone"}`,
      message: `${amount} USDC${memo ? ` - ${memo}` : ""}`,
      url: `${baseUrl}/settle/${data.id}`,
    }),
  });
} catch (notifError) {
  // Don't fail the request if notification fails
  console.error("Failed to send notification:", notifError);
}
```

### 7. Environment Variables

Add to `.env.example`:

```bash
# OneSignal Push Notifications
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key  # Server-side only
NEXT_PUBLIC_APP_URL=https://splithub.space  # For deep links
```

---

## File Changes Summary

| File                                  | Action | Description                                |
| ------------------------------------- | ------ | ------------------------------------------ |
| `package.json`                        | Modify | Add `react-onesignal`                      |
| `public/OneSignalSDKWorker.js`        | Create | OneSignal service worker                   |
| `next.config.ts`                      | Modify | Add `publicExcludes` for OneSignal worker  |
| `lib/onesignal.ts`                    | Create | OneSignal helpers with login/logout        |
| `components/OneSignalProvider.tsx`    | Create | Initialize & manage identity               |
| `components/NotificationToggle.tsx`   | Create | UI for enabling notifications              |
| `components/TopNav.tsx`               | Modify | Replace debug link with NotificationToggle |
| `app/api/notifications/send/route.ts` | Create | Backend notification sender                |
| `app/api/payment-requests/route.ts`   | Modify | Trigger notification on create             |
| `.env.example`                        | Modify | Add OneSignal env vars                     |

**No database migration needed!**

---

## User Flow

### Enabling Notifications

1. User logs in via Privy → `OneSignal.login(walletAddress)` called automatically
2. User opens TopNav dropdown → sees notification toggle
3. Clicks toggle → browser permission prompt appears
4. On "Allow" → OneSignal links this device to wallet address

### Multi-Device Support (Automatic)

- User logs in on iPhone → OneSignal maps iPhone to `0x123...`
- User logs in on Laptop → OneSignal maps Laptop to `0x123...`
- Send notification to `0x123...` → **Both devices receive it**

### Receiving Notifications

1. Alice creates payment request for Bob (`0xBob...`)
2. Server calls OneSignal API with `include_aliases: { external_id: ["0xbob..."] }`
3. OneSignal delivers to all Bob's registered devices
4. Bob taps notification → opens `/settle/{requestId}`

---

## Service Worker Coexistence

The `@ducanh2912/next-pwa` generates `sw.js` which could intercept OneSignal events.

**Solution**: Add to `next.config.ts`:

```typescript
module.exports = withPWA({
  dest: "public",
  publicExcludes: ["!OneSignalSDKWorker.js"],
})(nextConfig);
```

This tells Workbox to ignore the OneSignal worker file.

---

## Localhost Testing

### OneSignal Dashboard Setup

1. Create a **separate app** for development (don't use production app)
2. Set **Site URL** to: `http://localhost:3000`
3. Check **"Treat HTTP localhost as HTTPS for testing"**

### SDK Config (Already Included)

```typescript
OneSignal.init({
  appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
  allowLocalhostAsSecureOrigin: true, // Required for localhost
});
```

### Browser Support on Localhost

| Browser | Works on `http://localhost`?    |
| ------- | ------------------------------- |
| Chrome  | Yes (treats as secure origin)   |
| Firefox | Yes                             |
| Safari  | No (requires HTTPS - use ngrok) |

### Test Notification via curl

```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientWallet": "0xYourWallet",
    "title": "Test",
    "message": "Hello from localhost!"
  }'
```

---

## Testing Checklist

1. Create OneSignal dev app with `http://localhost:3000` as Site URL
2. Enable "Treat HTTP localhost as HTTPS for testing"
3. Add env vars to `.env.local`
4. Test login flow → verify `external_id` shows in OneSignal dashboard → **Audience**
5. Test permission prompt on desktop browser
6. Test notification delivery between two accounts
7. Test deep link opens correct settle page

---

## Security Notes

- `ONESIGNAL_REST_API_KEY` is server-side only (not exposed to client)
- All wallet addresses normalized to lowercase for consistency
- Notification failures don't block payment request creation
- Rate limiting handled by OneSignal

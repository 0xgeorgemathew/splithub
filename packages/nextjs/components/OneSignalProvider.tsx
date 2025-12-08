"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalType) => void>;
    OneSignal?: OneSignalType;
  }
}

export interface OneSignalNotificationClickEvent {
  notification: {
    additionalData?: {
      type?: string;
      requestId?: string;
      url?: string;
      amount?: string;
      requester?: string;
      payer?: string;
    };
  };
}

export interface OneSignalType {
  init: (config: { appId: string }) => Promise<void>;
  User: {
    PushSubscription: {
      id: string | null | undefined;
      addEventListener: (event: string, callback: (subscription: { id: string | null }) => void) => void;
    };
  };
  Notifications: {
    permission: boolean;
    requestPermission: () => Promise<void>;
    addEventListener: (event: string, callback: (event: OneSignalNotificationClickEvent) => void) => void;
  };
}

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const { user, authenticated } = usePrivy();
  const initialized = useRef(false);
  const lastSavedSubscriptionId = useRef<string | null>(null);

  // Load OneSignal SDK
  useEffect(() => {
    if (!ONESIGNAL_APP_ID || initialized.current) return;
    initialized.current = true;

    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    document.head.appendChild(script);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
      });

      // Handle notification clicks for deep linking
      OneSignal.Notifications.addEventListener("click", event => {
        const data = event.notification.additionalData;
        console.log("[OneSignal] Notification clicked:", JSON.stringify(data));

        if (data?.url) {
          // Use the URL from the notification data
          window.location.href = data.url;
        } else if (data?.type === "payment_request" && data?.requestId) {
          // Fallback: Navigate to settle page for payment requests
          window.location.href = `/settle/${data.requestId}`;
        } else if (data?.type === "payment_completed" || data?.type === "expense_created") {
          // Navigate to splits page for payment completed or expense created
          window.location.href = "/splits";
        } else {
          console.warn("[OneSignal] No redirect URL found in notification data");
        }
      });
    });
  }, []);

  // Save player ID when user is authenticated and has a subscription
  useEffect(() => {
    if (!authenticated || !user?.wallet?.address) return;

    const savePlayerId = async (subscriptionId: string) => {
      if (!subscriptionId) return;

      // Skip if we already saved this exact subscription ID
      if (lastSavedSubscriptionId.current === subscriptionId) {
        console.log("[OneSignal] Subscription ID unchanged, skipping save");
        return;
      }

      console.log("[OneSignal] Saving subscription ID:", {
        subscriptionId,
        walletAddress: user.wallet?.address,
        previousId: lastSavedSubscriptionId.current,
      });

      try {
        const response = await fetch("/api/user/onesignal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: user.wallet?.address,
            playerId: subscriptionId,
          }),
        });

        if (response.ok) {
          console.log("[OneSignal] Subscription ID saved successfully");
          lastSavedSubscriptionId.current = subscriptionId;
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("[OneSignal] Failed to save subscription ID:", {
            status: response.status,
            error: errorData,
          });
        }
      } catch (error) {
        console.error("[OneSignal] Error saving subscription ID:", error);
      }
    };

    // Check for existing subscription - always check on auth change
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
      const subscriptionId = OneSignal.User.PushSubscription.id;
      console.log("[OneSignal] Current browser subscription ID:", subscriptionId);

      if (subscriptionId) {
        await savePlayerId(subscriptionId);
      } else {
        console.log("[OneSignal] No subscription ID - user needs to enable notifications");
      }

      // Listen for future subscription changes (e.g., user re-subscribes)
      OneSignal.User.PushSubscription.addEventListener("change", async subscription => {
        console.log("[OneSignal] Subscription changed:", subscription.id);
        if (subscription.id) {
          await savePlayerId(subscription.id);
        }
      });
    });
  }, [authenticated, user?.wallet?.address]);

  return <>{children}</>;
}

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
  const playerIdSaved = useRef(false);

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
        console.log("[OneSignal] Notification clicked:", data);

        if (data?.url) {
          // Use the URL from the notification data
          window.location.href = data.url;
        } else if (data?.type === "payment_request" && data?.requestId) {
          // Fallback: Navigate to settle page for payment requests
          window.location.href = `/settle/${data.requestId}`;
        } else if (data?.type === "payment_completed") {
          // Navigate to splits page for payment completed
          window.location.href = "/splits";
        }
      });
    });
  }, []);

  // Save player ID when user is authenticated and has a subscription
  useEffect(() => {
    if (!authenticated || !user?.wallet?.address || playerIdSaved.current) return;

    const savePlayerId = async (subscriptionId: string, forceUpdate = false) => {
      if (!subscriptionId) return;
      if (playerIdSaved.current && !forceUpdate) return;

      console.log("[OneSignal] Saving subscription ID:", {
        subscriptionId,
        walletAddress: user.wallet?.address,
        forceUpdate,
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
          playerIdSaved.current = true;
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

    // Check for existing subscription
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
      const subscriptionId = OneSignal.User.PushSubscription.id;
      if (subscriptionId) {
        await savePlayerId(subscriptionId);
      }

      // Listen for future subscription changes (e.g., user re-subscribes)
      OneSignal.User.PushSubscription.addEventListener("change", async subscription => {
        console.log("[OneSignal] Subscription changed:", subscription.id);
        if (subscription.id) {
          // Force update since the subscription changed
          await savePlayerId(subscription.id, true);
        }
      });
    });
  }, [authenticated, user?.wallet?.address]);

  return <>{children}</>;
}

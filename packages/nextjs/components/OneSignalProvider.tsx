"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalType) => void>;
    OneSignal?: OneSignalType;
  }
}

interface OneSignalType {
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
  };
}

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const { user, authenticated } = usePrivy();
  const initialized = useRef(false);
  const playerIdSaved = useRef(false);

  useEffect(() => {
    if (!ONESIGNAL_APP_ID || initialized.current) return;
    initialized.current = true;

    console.log("[OneSignal] Loading SDK...");

    // Load OneSignal SDK
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    document.head.appendChild(script);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
      console.log("[OneSignal] Initializing with App ID:", ONESIGNAL_APP_ID);
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
      });
      console.log("[OneSignal] Initialized successfully");
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Save player ID when user is authenticated and subscribed
  useEffect(() => {
    console.log("[OneSignal] Auth effect - authenticated:", authenticated, "wallet:", user?.wallet?.address);
    if (!authenticated || !user?.wallet?.address || playerIdSaved.current) return;
    console.log("[OneSignal] User is authenticated, checking subscription...");

    const savePlayerId = async (playerId: string) => {
      if (!playerId || playerIdSaved.current) return;

      try {
        const response = await fetch("/api/user/onesignal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: user.wallet?.address,
            playerId,
          }),
        });

        if (response.ok) {
          playerIdSaved.current = true;
          console.log("OneSignal player ID saved");
        }
      } catch (error) {
        console.error("Failed to save OneSignal player ID:", error);
      }
    };

    // Check for existing subscription and request permission if needed
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
      console.log("[OneSignal] Checking subscription status...");
      console.log("[OneSignal] Current permission:", OneSignal.Notifications.permission);

      // Get current subscription ID
      const subscriptionId = OneSignal.User.PushSubscription.id;
      console.log("[OneSignal] Subscription ID:", subscriptionId);

      if (subscriptionId) {
        await savePlayerId(subscriptionId);
      } else if (!OneSignal.Notifications.permission) {
        // No subscription yet - request permission
        console.log("[OneSignal] Requesting permission...");
        await OneSignal.Notifications.requestPermission();
      }

      // Listen for future subscription changes
      OneSignal.User.PushSubscription.addEventListener("change", async subscription => {
        if (subscription.id) {
          await savePlayerId(subscription.id);
        }
      });
    });
  }, [authenticated, user?.wallet?.address]);

  return <>{children}</>;
}

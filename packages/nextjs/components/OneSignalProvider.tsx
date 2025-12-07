"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalType) => void>;
    OneSignal?: OneSignalType;
  }
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
    });
  }, []);

  // Save player ID when user is authenticated and has a subscription
  useEffect(() => {
    if (!authenticated || !user?.wallet?.address || playerIdSaved.current) return;

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
        }
      } catch (error) {
        console.error("Failed to save OneSignal player ID:", error);
      }
    };

    // Check for existing subscription
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
      const subscriptionId = OneSignal.User.PushSubscription.id;
      if (subscriptionId) {
        await savePlayerId(subscriptionId);
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

"use client";

import { useEffect, useState } from "react";
import { type OneSignalType } from "./OneSignalProvider";
import { Bell, X } from "lucide-react";

export function EnableNotificationsButton() {
  const [showBanner, setShowBanner] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if notifications are already enabled
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
      const hasPermission = OneSignal.Notifications.permission;
      const hasSubscription = !!OneSignal.User.PushSubscription.id;

      // Show banner if user hasn't enabled notifications
      if (!hasPermission && !hasSubscription) {
        setShowBanner(true);
      }
    });
  }, []);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);

    try {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
        await OneSignal.Notifications.requestPermission();
        // Hide banner after request (whether accepted or denied)
        setShowBanner(false);
      });
    } catch (error) {
      console.error("Failed to request notification permission:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base-content">Enable Notifications</p>
          <p className="text-sm text-base-content/60 mt-0.5">Get notified when someone requests payment from you</p>
        </div>
        <button onClick={handleDismiss} className="p-1 rounded-full hover:bg-base-300 transition-colors flex-shrink-0">
          <X className="w-4 h-4 text-base-content/50" />
        </button>
      </div>
      <button
        onClick={handleEnableNotifications}
        disabled={isRequesting}
        className="w-full mt-3 py-2.5 px-4 bg-primary text-primary-content rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isRequesting ? "Requesting..." : "Enable Notifications"}
      </button>
    </div>
  );
}

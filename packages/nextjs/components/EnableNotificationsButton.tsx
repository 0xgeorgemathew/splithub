"use client";

import { useState } from "react";
import { Bell, RefreshCw, X } from "lucide-react";
import { NotificationTroubleshoot } from "~~/components/NotificationTroubleshoot";
import { useNotificationStatus } from "~~/hooks/useNotificationStatus";

export function EnableNotificationsButton() {
  const [dismissed, setDismissed] = useState(false);

  const { sdkReady, browserSubscriptionId, needsResubscribe, isResubscribing, pendingDuration, resubscribe } =
    useNotificationStatus();

  // Don't show banner if:
  // - User dismissed it
  // - SDK not ready yet
  // - Already has a valid subscription
  const showBanner = sdkReady && !browserSubscriptionId && !dismissed;

  const handleEnableNotifications = async () => {
    const result = await resubscribe();

    if (result.success) {
      // Banner will auto-hide when browserSubscriptionId updates
      console.log("[EnableNotifications] Subscribed successfully:", result.subscriptionId);
    } else {
      console.error("[EnableNotifications] Failed:", result.error);
      // Don't hide banner on failure - let user see troubleshoot
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!showBanner) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          {needsResubscribe ? (
            <RefreshCw className="w-5 h-5 text-primary" />
          ) : (
            <Bell className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base-content">
            {needsResubscribe ? "Re-enable Notifications" : "Enable Notifications"}
          </p>
          <p className="text-sm text-base-content/60 mt-0.5">
            {needsResubscribe
              ? "Your notification subscription expired. Re-enable to receive payment alerts."
              : "Get notified when someone requests payment from you"}
          </p>
        </div>
        <button onClick={handleDismiss} className="p-1 rounded-full hover:bg-base-300 transition-colors flex-shrink-0">
          <X className="w-4 h-4 text-base-content/50" />
        </button>
      </div>
      <button
        onClick={handleEnableNotifications}
        disabled={isResubscribing}
        className="w-full mt-3 py-2.5 px-4 bg-primary text-primary-content rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isResubscribing ? "Requesting..." : needsResubscribe ? "Re-enable Notifications" : "Enable Notifications"}
      </button>

      {/* Troubleshoot section - shows after 15s stuck */}
      <NotificationTroubleshoot pendingDuration={pendingDuration} onRetry={() => window.location.reload()} minimal />
    </div>
  );
}

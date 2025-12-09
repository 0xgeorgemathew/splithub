"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { isOneSignalReady, isPushSubscribed, requestNotificationPermission } from "~~/lib/onesignal";

type NotificationState = "loading" | "default" | "granted" | "denied";

interface NotificationToggleProps {
  onAction?: () => void;
}

export const NotificationToggle = ({ onAction }: NotificationToggleProps) => {
  const [state, setState] = useState<NotificationState>("loading");
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check initial permission state with polling for SDK readiness
    const checkPermission = () => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        setState("denied");
        return;
      }

      const browserPermission = Notification.permission;

      // Browser denied = denied
      if (browserPermission === "denied") {
        setState("denied");
        return;
      }

      // Check OneSignal subscription status (not just browser permission)
      // User must have both browser permission AND OneSignal subscription
      if (browserPermission === "granted" && isPushSubscribed()) {
        setState("granted");
      } else {
        // Either no browser permission yet, or has permission but not subscribed to OneSignal
        setState("default");
      }
    };

    // Poll for SDK readiness then check permission
    const pollInterval = setInterval(() => {
      if (isOneSignalReady()) {
        clearInterval(pollInterval);
        checkPermission();
      }
    }, 100);

    // Also check immediately in case SDK is already ready
    if (isOneSignalReady()) {
      clearInterval(pollInterval);
      checkPermission();
    }

    // Fallback: check anyway after 2s even if SDK isn't ready
    const fallbackTimer = setTimeout(() => {
      clearInterval(pollInterval);
      checkPermission();
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleToggle = async () => {
    if (state === "denied" || state === "granted") {
      // Already granted or denied - nothing to do
      onAction?.();
      return;
    }

    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      setState(granted ? "granted" : "denied");
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      setState("denied");
    } finally {
      setIsRequesting(false);
      onAction?.();
    }
  };

  const getIcon = () => {
    if (isRequesting) {
      return <Loader2 className="w-5 h-5 text-info animate-spin" />;
    }
    switch (state) {
      case "granted":
        return <BellRing className="w-5 h-5 text-success" />;
      case "denied":
        return <BellOff className="w-5 h-5 text-error/70" />;
      default:
        return <Bell className="w-5 h-5 text-info" />;
    }
  };

  const getGradient = () => {
    switch (state) {
      case "granted":
        return "from-success/20 to-success/10";
      case "denied":
        return "from-error/20 to-error/10";
      default:
        return "from-info/20 to-info/10";
    }
  };

  const getStatusText = () => {
    if (isRequesting) return "Requesting...";
    switch (state) {
      case "loading":
        return "Checking...";
      case "granted":
        return "Notifications enabled";
      case "denied":
        return "Blocked by browser";
      default:
        return "Tap to enable";
    }
  };

  const getSubtext = () => {
    switch (state) {
      case "granted":
        return "You'll receive payment alerts";
      case "denied":
        return "Enable in browser settings";
      default:
        return "Get notified of payment requests";
    }
  };

  return (
    <motion.button
      onClick={handleToggle}
      disabled={state === "loading" || isRequesting}
      whileHover={state !== "denied" ? { scale: 1.01 } : undefined}
      whileTap={state !== "denied" ? { scale: 0.99 } : undefined}
      className={`w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 transition-colors text-left ${
        state === "denied" ? "opacity-60 cursor-not-allowed" : "hover:bg-white/[0.06] cursor-pointer"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGradient()} flex items-center justify-center`}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-base-content/40 uppercase tracking-wider">Push Notifications</p>
        <p className="text-sm text-base-content">{getStatusText()}</p>
        <p className="text-[10px] text-base-content/40 mt-0.5">{getSubtext()}</p>
      </div>
      {state === "granted" && <div className="w-2 h-2 rounded-full bg-success animate-pulse" />}
    </motion.button>
  );
};

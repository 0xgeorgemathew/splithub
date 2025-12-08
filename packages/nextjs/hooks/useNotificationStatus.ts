"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { type OneSignalType } from "~~/components/OneSignalProvider";

// Error types for telemetry
type NotificationErrorCode =
  | "PERMISSION_DENIED"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "SDK_NOT_READY"
  | "SW_REGISTRATION_FAILED"
  | "DB_SYNC_FAILED"
  | "UNKNOWN"
  | "SUCCESS";

interface ResubscribeResult {
  success: boolean;
  subscriptionId?: string;
  errorCode?: NotificationErrorCode;
  error?: string;
}

interface TelemetryData {
  wallet: string | null;
  duration: number;
  errorCode: NotificationErrorCode;
  permission: boolean | null;
  subscriptionId: string | null;
  userAgent: string;
  timestamp: string;
}

export interface NotificationStatus {
  // State
  permission: boolean | null;
  browserSubscriptionId: string | null;
  dbSubscriptionId: string | null;
  sdkReady: boolean;

  // Derived
  isHealthy: boolean;
  needsResubscribe: boolean;
  isStale: boolean;
  isMismatched: boolean;

  // Actions
  resubscribe: () => Promise<ResubscribeResult>;
  syncToDatabase: () => Promise<void>;
  clearStaleSubscription: () => Promise<void>;
  refresh: () => Promise<void>;

  // UI State
  isResubscribing: boolean;
  error: string | null;
  pendingDuration: number;
}

// Timeouts
const SDK_READY_TIMEOUT = 5000;
const SUBSCRIPTION_WAIT_TIMEOUT = 8000;
const HARD_TIMEOUT = 10000;
const SERVICE_WORKER_FORCE_TIMEOUT = 5000;

export function useNotificationStatus(): NotificationStatus {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address?.toLowerCase();

  // State
  const [permission, setPermission] = useState<boolean | null>(null);
  const [browserSubscriptionId, setBrowserSubscriptionId] = useState<string | null>(null);
  const [dbSubscriptionId, setDbSubscriptionId] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [isResubscribing, setIsResubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDuration, setPendingDuration] = useState(0);

  // Refs
  const sdkReadyRef = useRef(false);
  const resubscribingRef = useRef(false);

  // Derived state
  const isHealthy = sdkReady && !!browserSubscriptionId && browserSubscriptionId === dbSubscriptionId;
  const needsResubscribe = sdkReady && permission === true && !browserSubscriptionId;
  const isStale = !!dbSubscriptionId && !browserSubscriptionId;
  const isMismatched = !!browserSubscriptionId && !!dbSubscriptionId && browserSubscriptionId !== dbSubscriptionId;

  // Track pending duration
  useEffect(() => {
    if (!isResubscribing) {
      setPendingDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setPendingDuration(prev => prev + 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [isResubscribing]);

  // Log telemetry
  const logTelemetry = useCallback(async (data: TelemetryData) => {
    console.log("[Notification Telemetry]", data);

    // Also POST to backend for debugging
    try {
      await fetch("/api/telemetry/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      // Non-critical, don't block on telemetry failures
      console.warn("[Notification Telemetry] Failed to send to server");
    }
  }, []);

  // Initialize SDK state check
  useEffect(() => {
    if (!walletAddress) return;

    let sdkResponded = false;

    const sdkTimeout = setTimeout(() => {
      if (!sdkResponded) {
        console.log("[Notification] SDK timeout - marking as not ready");
        setPermission(false);
        setBrowserSubscriptionId(null);
        setSdkReady(false);
      }
    }, SDK_READY_TIMEOUT);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
      sdkResponded = true;
      sdkReadyRef.current = true;
      clearTimeout(sdkTimeout);

      setSdkReady(true);
      setBrowserSubscriptionId(OneSignal.User.PushSubscription.id || null);
      setPermission(OneSignal.Notifications.permission);

      console.log("[Notification] SDK ready:", {
        permission: OneSignal.Notifications.permission,
        subscriptionId: OneSignal.User.PushSubscription.id,
      });
    });

    return () => clearTimeout(sdkTimeout);
  }, [walletAddress]);

  // Fetch DB subscription on mount
  useEffect(() => {
    if (!walletAddress) return;

    const fetchDbSubscription = async () => {
      try {
        const res = await fetch(`/api/debug/test-notification?wallet=${walletAddress}`);
        const data = await res.json();
        setDbSubscriptionId(data.subscriptionId || null);
      } catch {
        console.error("[Notification] Failed to fetch DB subscription");
      }
    };

    fetchDbSubscription();
  }, [walletAddress]);

  // Service worker force-registration for orphaned workers
  useEffect(() => {
    if (!sdkReady || browserSubscriptionId || !permission) return;

    const forceRegisterTimer = setTimeout(async () => {
      if (browserSubscriptionId) return; // Check again in case it changed

      console.log("[Notification] Attempting service worker force-registration");

      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (!registration) {
            await navigator.serviceWorker.register("/OneSignalSDKWorker.js");
            console.log("[Notification] Service worker registered manually");

            // Try to trigger opt-in
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
              if ("optIn" in OneSignal.User.PushSubscription) {
                await (OneSignal.User.PushSubscription as { optIn: () => Promise<void> }).optIn();
              }
            });
          }
        } catch (err) {
          console.error("[Notification] Service worker force-registration failed:", err);
        }
      }
    }, SERVICE_WORKER_FORCE_TIMEOUT);

    return () => clearTimeout(forceRegisterTimer);
  }, [sdkReady, browserSubscriptionId, permission]);

  // Sync browser subscription to database
  const syncToDatabase = useCallback(async () => {
    if (!browserSubscriptionId || !walletAddress) return;

    try {
      const res = await fetch("/api/user/onesignal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          playerId: browserSubscriptionId,
        }),
      });

      if (res.ok) {
        setDbSubscriptionId(browserSubscriptionId);
        console.log("[Notification] Synced to database");
      } else {
        throw new Error("Failed to sync");
      }
    } catch (err) {
      console.error("[Notification] DB sync failed:", err);
      setError("Failed to sync subscription to database");
    }
  }, [browserSubscriptionId, walletAddress]);

  // Database reconciliation
  useEffect(() => {
    if (!walletAddress || !sdkReady) return;

    const reconcile = async () => {
      // Browser has newer ID - update DB
      if (browserSubscriptionId && browserSubscriptionId !== dbSubscriptionId) {
        console.log("[Notification] Reconciling: browser has newer ID");
        await syncToDatabase();
      }
      // DB has ID but browser lost it - show toast and trigger recovery
      else if (dbSubscriptionId && !browserSubscriptionId && permission === true) {
        console.log("[Notification] Reconciling: browser lost subscription, attempting recovery");
        // We don't auto-resubscribe here - let the UI show the toast
      }
    };

    reconcile();
  }, [walletAddress, sdkReady, browserSubscriptionId, dbSubscriptionId, permission, syncToDatabase]);

  // Clear stale subscription from database
  const clearStaleSubscription = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const res = await fetch("/api/user/onesignal", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      if (res.ok) {
        setDbSubscriptionId(null);
        console.log("[Notification] Cleared stale subscription from DB");
      }
    } catch (err) {
      console.error("[Notification] Failed to clear stale subscription:", err);
    }
  }, [walletAddress]);

  // Refresh all state
  const refresh = useCallback(async () => {
    if (!walletAddress) return;

    // Refresh browser state
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
      setBrowserSubscriptionId(OneSignal.User.PushSubscription.id || null);
      setPermission(OneSignal.Notifications.permission);
    });

    // Refresh DB state
    try {
      const res = await fetch(`/api/debug/test-notification?wallet=${walletAddress}`);
      const data = await res.json();
      setDbSubscriptionId(data.subscriptionId || null);
    } catch {
      // Ignore
    }
  }, [walletAddress]);

  // Atomic resubscribe with Promise.race
  const resubscribe = useCallback(async (): Promise<ResubscribeResult> => {
    if (resubscribingRef.current) {
      return { success: false, errorCode: "UNKNOWN", error: "Already resubscribing" };
    }

    const startTime = Date.now();
    let errorCode: NotificationErrorCode = "UNKNOWN";

    setIsResubscribing(true);
    resubscribingRef.current = true;
    setError(null);

    try {
      const result = await Promise.race([
        // Path A: Attempt subscription (8s internal timeout)
        attemptSubscription(),

        // Path B: Hard timeout (10s)
        new Promise<ResubscribeResult>(resolve =>
          setTimeout(
            () =>
              resolve({
                success: false,
                errorCode: "TIMEOUT",
                error: "Request timed out. Please refresh and try again.",
              }),
            HARD_TIMEOUT,
          ),
        ),
      ]);

      errorCode = result.errorCode || (result.success ? "SUCCESS" : "UNKNOWN");

      if (!result.success) {
        setError(result.error || "Failed to subscribe");
      } else {
        // Update local state on success
        setBrowserSubscriptionId(result.subscriptionId || null);
        if (result.subscriptionId) {
          setDbSubscriptionId(result.subscriptionId);
        }
      }

      return result;
    } catch (err) {
      errorCode = "UNKNOWN";
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      return { success: false, errorCode, error: errorMessage };
    } finally {
      setIsResubscribing(false);
      resubscribingRef.current = false;

      // Log telemetry
      await logTelemetry({
        wallet: walletAddress?.slice(0, 10) || null,
        duration: Date.now() - startTime,
        errorCode,
        permission,
        subscriptionId: browserSubscriptionId?.slice(0, 8) || null,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        timestamp: new Date().toISOString(),
      });
    }

    // Internal subscription attempt
    async function attemptSubscription(): Promise<ResubscribeResult> {
      return new Promise(resolve => {
        if (!sdkReadyRef.current) {
          resolve({
            success: false,
            errorCode: "SDK_NOT_READY",
            error: "OneSignal SDK not ready. Please refresh the page.",
          });
          return;
        }

        const internalTimeout = setTimeout(() => {
          resolve({
            success: false,
            errorCode: "TIMEOUT",
            error: "Subscription took too long. Please try again.",
          });
        }, SUBSCRIPTION_WAIT_TIMEOUT);

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
          try {
            await OneSignal.Notifications.requestPermission();

            // Check if permission was actually granted
            const permissionGranted = OneSignal.Notifications.permission;
            setPermission(permissionGranted);

            if (!permissionGranted) {
              clearTimeout(internalTimeout);
              resolve({
                success: false,
                errorCode: "PERMISSION_DENIED",
                error: "Notification permission denied. Please allow notifications in browser settings.",
              });
              return;
            }

            // Wait for subscription to be created
            await new Promise(r => setTimeout(r, 2500));
            const newId = OneSignal.User.PushSubscription.id;

            if (!newId) {
              clearTimeout(internalTimeout);
              resolve({
                success: false,
                errorCode: "SW_REGISTRATION_FAILED",
                error:
                  "Failed to get subscription ID. This can happen if:\n• Browser doesn't support push notifications\n• Service worker failed to register\n• Try refreshing the page",
              });
              return;
            }

            // Save to database
            if (walletAddress) {
              const res = await fetch("/api/user/onesignal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  walletAddress,
                  playerId: newId,
                }),
              });

              if (!res.ok) {
                clearTimeout(internalTimeout);
                resolve({
                  success: false,
                  errorCode: "DB_SYNC_FAILED",
                  error: "Failed to save subscription to database.",
                });
                return;
              }
            }

            clearTimeout(internalTimeout);
            resolve({
              success: true,
              subscriptionId: newId,
              errorCode: "SUCCESS",
            });
          } catch (err) {
            clearTimeout(internalTimeout);
            const isNetworkError =
              err instanceof TypeError && (err.message.includes("fetch") || err.message.includes("network"));
            resolve({
              success: false,
              errorCode: isNetworkError ? "NETWORK_ERROR" : "UNKNOWN",
              error: err instanceof Error ? err.message : "Unknown error during subscription",
            });
          }
        });
      });
    }
  }, [walletAddress, permission, browserSubscriptionId, logTelemetry]);

  return {
    // State
    permission,
    browserSubscriptionId,
    dbSubscriptionId,
    sdkReady,

    // Derived
    isHealthy,
    needsResubscribe,
    isStale,
    isMismatched,

    // Actions
    resubscribe,
    syncToDatabase,
    clearStaleSubscription,
    refresh,

    // UI State
    isResubscribing,
    error,
    pendingDuration,
  };
}

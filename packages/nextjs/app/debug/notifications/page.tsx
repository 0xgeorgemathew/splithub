"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { NotificationTroubleshoot } from "~~/components/NotificationTroubleshoot";
import { useNotificationStatus } from "~~/hooks/useNotificationStatus";

export default function NotificationDebugPage() {
  const { user, authenticated } = usePrivy();
  const [testResult, setTestResult] = useState<string>("");
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const walletAddress = user?.wallet?.address?.toLowerCase();

  const {
    permission,
    browserSubscriptionId,
    dbSubscriptionId,
    sdkReady,
    isHealthy,
    isStale,
    isMismatched,
    needsResubscribe,
    isResubscribing,
    error,
    pendingDuration,
    resubscribe,
    clearStaleSubscription,
    refresh,
  } = useNotificationStatus();

  const handleTestNotification = async () => {
    if (!walletAddress) return;
    setTesting(true);
    setTestResult("");

    try {
      const res = await fetch(`/api/debug/test-notification?wallet=${walletAddress}`);
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setTestResult(`Error: ${err}`);
    } finally {
      setTesting(false);
    }
  };

  const handleClearSubscription = async () => {
    if (!walletAddress) return;
    setClearing(true);
    setTestResult("");

    try {
      await clearStaleSubscription();
      setTestResult("Database subscription ID cleared! Now tap 'Re-subscribe' to get a fresh one.");
    } catch (err) {
      setTestResult(`Error: ${err}`);
    } finally {
      setClearing(false);
    }
  };

  const handleResubscribe = async () => {
    setTestResult("");
    const result = await resubscribe();

    if (result.success) {
      setTestResult(`Re-subscribed successfully! New ID: ${result.subscriptionId}`);
    } else {
      setTestResult(`${result.error || "Failed to subscribe"}`);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-base-100 p-6">
        <h1 className="text-2xl font-bold mb-4">Notification Debug</h1>
        <p>Please log in first.</p>
      </div>
    );
  }

  const loading = !sdkReady && permission === null;

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Notification Debug</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          <div className="bg-base-200 rounded-lg p-4">
            <h2 className="font-semibold mb-2">Status</h2>
            <div className="space-y-2 text-sm font-mono">
              <p>
                <span className="text-base-content/60">Wallet:</span> {walletAddress?.slice(0, 10)}...
              </p>
              <p>
                <span className="text-base-content/60">SDK Ready:</span> {sdkReady ? "Yes" : "No"}
              </p>
              <p>
                <span className="text-base-content/60">Permission:</span>{" "}
                {permission === null ? "Loading..." : permission ? "Granted" : "Not granted"}
              </p>
              <p>
                <span className="text-base-content/60">Browser Subscription:</span>{" "}
                {browserSubscriptionId ? `${browserSubscriptionId.slice(0, 8)}...` : "None"}
              </p>
              <p>
                <span className="text-base-content/60">Database Subscription:</span>{" "}
                {dbSubscriptionId ? `${dbSubscriptionId.slice(0, 8)}...` : "None"}
              </p>
            </div>
          </div>

          {/* Diagnosis */}
          <div
            className={`rounded-lg p-4 ${
              isStale
                ? "bg-error/20"
                : isMismatched || needsResubscribe
                  ? "bg-warning/20"
                  : isHealthy
                    ? "bg-success/20"
                    : "bg-warning/20"
            }`}
          >
            <h2 className="font-semibold mb-2">Diagnosis</h2>
            {isStale ? (
              <p className="text-error">
                <strong>STALE SUBSCRIPTION</strong> - Database has old ID but browser has none. Click
                &quot;Re-subscribe&quot; below.
              </p>
            ) : isMismatched ? (
              <p className="text-warning">
                <strong>MISMATCH</strong> - Browser and database have different IDs. Click &quot;Re-subscribe&quot; to
                fix.
              </p>
            ) : needsResubscribe ? (
              <p className="text-warning">
                <strong>NEEDS RESUBSCRIPTION</strong> - Permission granted but no subscription. Click
                &quot;Re-subscribe&quot;.
              </p>
            ) : isHealthy ? (
              <p className="text-success">Everything looks good!</p>
            ) : (
              <p className="text-warning">No subscription. Click &quot;Re-subscribe&quot; to enable notifications.</p>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-error/20 rounded-lg p-4">
              <h2 className="font-semibold mb-2 text-error">Error</h2>
              <p className="text-sm whitespace-pre-wrap">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={handleResubscribe}
                disabled={isResubscribing}
                className="flex-1 py-3 px-4 bg-primary text-primary-content rounded-lg font-medium disabled:opacity-50"
              >
                {isResubscribing ? "Re-subscribing..." : "Re-subscribe"}
              </button>
              <button
                onClick={handleTestNotification}
                disabled={testing || !browserSubscriptionId}
                className="flex-1 py-3 px-4 bg-base-300 rounded-lg font-medium disabled:opacity-50"
              >
                {testing ? "Testing..." : "Test Notification"}
              </button>
            </div>
            {/* Clear stale subscription from DB */}
            {dbSubscriptionId && (
              <button
                onClick={handleClearSubscription}
                disabled={clearing}
                className="w-full py-3 px-4 bg-error/20 text-error rounded-lg font-medium disabled:opacity-50"
              >
                {clearing ? "Clearing..." : "Clear Stale DB Subscription"}
              </button>
            )}
            {/* Refresh button */}
            <button
              onClick={refresh}
              className="w-full py-3 px-4 bg-base-300 rounded-lg font-medium hover:bg-base-300/80"
            >
              Refresh Status
            </button>
          </div>

          {/* Troubleshoot section - shows after 15s */}
          <NotificationTroubleshoot
            pendingDuration={pendingDuration}
            onRetry={() => {
              window.location.reload();
            }}
          />

          {/* Result */}
          {testResult && (
            <div className="bg-base-200 rounded-lg p-4">
              <h2 className="font-semibold mb-2">Result</h2>
              <pre className="text-xs overflow-auto whitespace-pre-wrap">{testResult}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

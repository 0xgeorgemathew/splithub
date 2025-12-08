"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { type OneSignalType } from "~~/components/OneSignalProvider";

export default function NotificationDebugPage() {
  const { user, authenticated } = usePrivy();
  const [browserSubscriptionId, setBrowserSubscriptionId] = useState<string | null>(null);
  const [dbSubscriptionId, setDbSubscriptionId] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [testResult, setTestResult] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [resubscribing, setResubscribing] = useState(false);
  const [clearing, setClearing] = useState(false);

  const walletAddress = user?.wallet?.address?.toLowerCase();

  useEffect(() => {
    if (!walletAddress) return;

    // Check browser state
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
      setBrowserSubscriptionId(OneSignal.User.PushSubscription.id || null);
      setHasPermission(OneSignal.Notifications.permission);
    });

    // Check database state
    fetch(`/api/debug/test-notification?wallet=${walletAddress}`)
      .then(res => res.json())
      .then(data => {
        setDbSubscriptionId(data.subscriptionId || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [walletAddress]);

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
      const res = await fetch("/api/user/onesignal", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
      const data = await res.json();
      if (res.ok) {
        setDbSubscriptionId(null);
        setTestResult("✅ Database subscription ID cleared! Now tap 'Re-subscribe' to get a fresh one.");
      } else {
        setTestResult(`❌ Failed to clear: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      setTestResult(`Error: ${err}`);
    } finally {
      setClearing(false);
    }
  };

  const handleResubscribe = async () => {
    setResubscribing(true);
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
        await OneSignal.Notifications.requestPermission();
        // Wait a moment for subscription to be created
        await new Promise(resolve => setTimeout(resolve, 1000));
        const newId = OneSignal.User.PushSubscription.id;
        setBrowserSubscriptionId(newId || null);
        setHasPermission(OneSignal.Notifications.permission);

        if (newId && walletAddress) {
          // Save to database
          await fetch("/api/user/onesignal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              walletAddress,
              playerId: newId,
            }),
          });
          setDbSubscriptionId(newId);
          setTestResult("✅ Re-subscribed successfully! New ID: " + newId);
        } else {
          setTestResult("❌ Failed to get new subscription ID");
        }
        setResubscribing(false);
      });
    } catch (err) {
      setTestResult(`Error: ${err}`);
      setResubscribing(false);
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

  const subscriptionMismatch = browserSubscriptionId !== dbSubscriptionId;
  const isStale = dbSubscriptionId && !browserSubscriptionId;

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <h1 className="text-2xl font-bold mb-4">🔔 Notification Debug</h1>

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
                <span className="text-base-content/60">Permission:</span>{" "}
                {hasPermission === null ? "Loading..." : hasPermission ? "✅ Granted" : "❌ Not granted"}
              </p>
              <p>
                <span className="text-base-content/60">Browser Subscription:</span>{" "}
                {browserSubscriptionId ? `✅ ${browserSubscriptionId.slice(0, 8)}...` : "❌ None"}
              </p>
              <p>
                <span className="text-base-content/60">Database Subscription:</span>{" "}
                {dbSubscriptionId ? `${dbSubscriptionId.slice(0, 8)}...` : "❌ None"}
              </p>
            </div>
          </div>

          {/* Diagnosis */}
          <div
            className={`rounded-lg p-4 ${isStale ? "bg-error/20" : subscriptionMismatch ? "bg-warning/20" : "bg-success/20"}`}
          >
            <h2 className="font-semibold mb-2">Diagnosis</h2>
            {isStale ? (
              <p className="text-error">
                ⚠️ <strong>STALE SUBSCRIPTION</strong> - Database has old ID but browser has none. Click
                &quot;Re-subscribe&quot; below.
              </p>
            ) : subscriptionMismatch ? (
              <p className="text-warning">
                ⚠️ <strong>MISMATCH</strong> - Browser and database have different IDs. Click &quot;Re-subscribe&quot;
                to fix.
              </p>
            ) : browserSubscriptionId ? (
              <p className="text-success">✅ Everything looks good!</p>
            ) : (
              <p className="text-warning">
                ⚠️ No subscription. Click &quot;Re-subscribe&quot; to enable notifications.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={handleResubscribe}
                disabled={resubscribing}
                className="flex-1 py-3 px-4 bg-primary text-primary-content rounded-lg font-medium disabled:opacity-50"
              >
                {resubscribing ? "Re-subscribing..." : "🔄 Re-subscribe"}
              </button>
              <button
                onClick={handleTestNotification}
                disabled={testing || !browserSubscriptionId}
                className="flex-1 py-3 px-4 bg-base-300 rounded-lg font-medium disabled:opacity-50"
              >
                {testing ? "Testing..." : "📤 Test Notification"}
              </button>
            </div>
            {/* Clear stale subscription from DB */}
            {dbSubscriptionId && (
              <button
                onClick={handleClearSubscription}
                disabled={clearing}
                className="w-full py-3 px-4 bg-error/20 text-error rounded-lg font-medium disabled:opacity-50"
              >
                {clearing ? "Clearing..." : "🗑️ Clear Stale DB Subscription"}
              </button>
            )}
          </div>

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

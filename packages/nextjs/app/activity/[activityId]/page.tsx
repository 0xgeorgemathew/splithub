"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Nfc } from "lucide-react";
import { ActivityDeviceFrame, ActivityReceiptPrinter } from "~~/components/activity";
import { getActivityById } from "~~/config/activities";
import { useCreditSpend } from "~~/hooks/credits";

export default function ActivityPage() {
  const params = useParams();
  const activityId = Number(params.activityId);
  const activity = getActivityById(activityId);

  const { flowState, error, txHash, remainingBalance, networkName, spendCredits, reset } = useCreditSpend({});

  const handleTap = useCallback(() => {
    if (!activity || flowState !== "idle") return;
    spendCredits(activity.credits, activity.id);
  }, [activity, flowState, spendCredits]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  // Determine LED state
  const getLedState = () => {
    if (flowState === "success") return "success";
    if (flowState !== "idle" && flowState !== "error") return "processing";
    if (flowState === "error") return "idle";
    return "ready";
  };

  // Activity not found
  if (!activity) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <ActivityDeviceFrame ledState="idle">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-[#ef4444] mx-auto mb-4 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <div className="font-mono text-sm text-[#ef4444] tracking-wider">ACTIVITY NOT FOUND</div>
          </div>
        </ActivityDeviceFrame>
      </div>
    );
  }

  const ActivityIcon = activity.icon;
  const isIdle = flowState === "idle";
  const showReceipt = flowState !== "idle";

  return (
    <div className="min-h-screen bg-black p-4 pb-28">
      {/* Back button */}
      <Link
        href="/activities"
        className="inline-flex items-center gap-2 mb-6 text-[#22c55e] opacity-60 hover:opacity-100 transition-opacity"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-mono text-xs tracking-wider">BACK</span>
      </Link>

      <ActivityDeviceFrame ledState={getLedState()}>
        {showReceipt ? (
          <ActivityReceiptPrinter
            flowState={flowState}
            activity={activity}
            txHash={txHash}
            networkName={networkName}
            remainingBalance={remainingBalance}
            error={error}
            onRetry={handleReset}
            onDismiss={handleReset}
          />
        ) : (
          <>
            {/* Activity Info */}
            <div className="activity-info-display">
              <div className="activity-info-icon">
                <ActivityIcon className="w-8 h-8" />
              </div>
              <div className="activity-info-name">{activity.name}</div>
              <div className="activity-info-cost">{activity.credits} CREDITS</div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="activity-error-display">
                <AlertCircle className="w-4 h-4" />
                <span className="activity-error-text">{error}</span>
              </div>
            )}

            {/* Tap Button */}
            <button onClick={handleTap} disabled={!isIdle} className="activity-tap-btn">
              <div className="activity-tap-btn-content">
                <Nfc className="w-8 h-8 activity-tap-btn-icon" />
                <span className="activity-tap-btn-text">TAP TO ACCESS</span>
                <span className="activity-tap-btn-subtext">DEDUCTS {activity.credits} CR</span>
              </div>
            </button>
          </>
        )}
      </ActivityDeviceFrame>
    </div>
  );
}

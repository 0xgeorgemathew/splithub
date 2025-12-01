"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Loader2, Wallet, Wifi } from "lucide-react";
import { ActivityDeviceFrame } from "~~/components/activity/ActivityDeviceFrame";
import { getActivityById } from "~~/config/activities";
import { useCreditBalance, useCreditSpend } from "~~/hooks/credits";

export default function ActivityPage() {
  const params = useParams();
  const activityId = Number(params.activityId);
  const activity = getActivityById(activityId);

  const { formattedBalance, refetchBalance, isConnected } = useCreditBalance();

  const [accessGranted, setAccessGranted] = useState(false);

  const { flowState, error, creditTokenAddress, spendCredits, reset } = useCreditSpend({
    onSuccess: () => {
      refetchBalance();
      // Delay access granted to show success state
      setTimeout(() => setAccessGranted(true), 1500);
    },
  });

  const handleTap = useCallback(() => {
    if (!activity || flowState !== "idle") return;
    spendCredits(activity.credits, activity.id);
  }, [activity, flowState, spendCredits]);

  const handleReset = useCallback(() => {
    reset();
    setAccessGranted(false);
  }, [reset]);

  // Determine LED state
  const getLedState = () => {
    if (accessGranted || flowState === "success") return "success";
    if (flowState !== "idle" && flowState !== "error") return "processing";
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

  // Not connected
  if (!isConnected || !creditTokenAddress) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <ActivityDeviceFrame ledState="idle">
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 text-[#22c55e] opacity-40 mx-auto mb-4" />
            <div className="font-mono text-sm text-[#22c55e] opacity-60 tracking-wider">CONNECT WALLET</div>
            <div className="font-mono text-xs text-[#22c55e] opacity-40 mt-2">
              TO ACCESS {activity.name.toUpperCase()}
            </div>
          </div>
        </ActivityDeviceFrame>
      </div>
    );
  }

  const ActivityIcon = activity.icon;
  const isProcessing = flowState !== "idle" && flowState !== "error" && flowState !== "success";
  const insufficientBalance = formattedBalance < activity.credits;

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
        {/* Access Granted State */}
        {accessGranted ? (
          <div className="activity-success-display">
            <div className="activity-success-icon">
              <Check className="w-10 h-10" strokeWidth={3} />
            </div>
            <div className="activity-success-title">ACCESS GRANTED</div>
            <div className="activity-success-subtitle">ENJOY YOUR {activity.name.toUpperCase()} SESSION</div>
            <button onClick={handleReset} className="activity-success-btn">
              DONE
            </button>
          </div>
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

            {/* Balance Display */}
            <div className="activity-balance-display">
              <span className="activity-balance-label">YOUR BALANCE</span>
              <span className="activity-balance-value">{formattedBalance.toFixed(0)} CR</span>
            </div>

            {/* Error Display */}
            {error && (
              <div className="activity-error-display">
                <AlertCircle className="w-4 h-4" />
                <span className="activity-error-text">{error}</span>
              </div>
            )}

            {/* Insufficient Balance Warning */}
            {insufficientBalance && !error && (
              <div className="activity-error-display">
                <AlertCircle className="w-4 h-4" />
                <span className="activity-error-text">INSUFFICIENT CREDITS. NEED {activity.credits} CR.</span>
              </div>
            )}

            {/* Tap Button */}
            <button onClick={handleTap} disabled={isProcessing || insufficientBalance} className="activity-tap-btn">
              <div className="activity-tap-btn-content">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-8 h-8 activity-tap-btn-icon animate-spin" />
                    <span className="activity-tap-btn-text">
                      {flowState === "tapping"
                        ? "WAITING..."
                        : flowState === "signing"
                          ? "SIGNING..."
                          : flowState === "submitting"
                            ? "SENDING..."
                            : "CONFIRMING..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-8 h-8 activity-tap-btn-icon" />
                    <span className="activity-tap-btn-text">TAP TO ACCESS</span>
                    <span className="activity-tap-btn-subtext">DEDUCTS {activity.credits} CR</span>
                  </>
                )}
              </div>
            </button>
          </>
        )}
      </ActivityDeviceFrame>
    </div>
  );
}

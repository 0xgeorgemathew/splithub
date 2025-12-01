"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle, Loader2, Wallet } from "lucide-react";
import { ActivityTxWidget } from "~~/components/activity";
import { getActivityById } from "~~/config/activities";
import { useCreditBalance, useCreditSpend } from "~~/hooks/credits";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

export default function ActivityPage() {
  const params = useParams();
  const activityId = Number(params.activityId);
  const activity = getActivityById(activityId);

  const { targetNetwork } = useTargetNetwork();
  const { formattedBalance, refetchBalance, isConnected } = useCreditBalance();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);

  const {
    flowState,
    error,
    txHash: spendTxHash,
    creditTokenAddress,
    spendCredits,
    reset,
  } = useCreditSpend({
    onSuccess: hash => {
      setTxHash(hash);
      refetchBalance();
    },
  });

  // Update txHash when spend succeeds
  useEffect(() => {
    if (spendTxHash) {
      setTxHash(spendTxHash);
    }
  }, [spendTxHash]);

  const handleTap = useCallback(() => {
    if (!activity || flowState !== "idle") return;
    spendCredits(activity.credits, activity.id);
  }, [activity, flowState, spendCredits]);

  const handleComplete = useCallback(() => {
    setAccessGranted(true);
  }, []);

  const handleReset = useCallback(() => {
    reset();
    setTxHash(null);
    setAccessGranted(false);
  }, [reset]);

  // Activity not found
  if (!activity) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-base-200 flex items-center justify-center pb-28">
        <div className="text-center px-6">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-base-content mb-2">Activity Not Found</h2>
          <p className="text-base-content/50 text-sm">This activity does not exist.</p>
        </div>
      </div>
    );
  }

  // Not connected
  if (!isConnected || !creditTokenAddress) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-base-200 flex items-center justify-center pb-28">
        <div className="flex flex-col items-center text-center px-6">
          <div className="w-20 h-20 rounded-full bg-base-300/50 flex items-center justify-center mb-6">
            <Wallet className="w-10 h-10 text-base-content/30" />
          </div>
          <h2 className="text-xl font-bold text-base-content mb-2">Connect Wallet</h2>
          <p className="text-base-content/50 text-sm">Connect your wallet to access {activity.name}</p>
        </div>
      </div>
    );
  }

  const ActivityIcon = activity.icon;
  const isProcessing = flowState !== "idle" && flowState !== "error" && flowState !== "success";
  const insufficientBalance = formattedBalance < activity.credits;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 pb-28">
      <div className="w-full max-w-md mx-auto px-4 pt-6">
        {/* Activity Header */}
        <div className="text-center mb-6">
          <div
            className={`
              w-20 h-20 mx-auto mb-4 rounded-2xl
              bg-base-100 border border-base-300
              flex items-center justify-center
              shadow-lg
            `}
          >
            <ActivityIcon
              className={`w-10 h-10 ${
                activity.color === "red"
                  ? "text-red-400"
                  : activity.color === "blue"
                    ? "text-blue-400"
                    : "text-cyan-400"
              }`}
            />
          </div>
          <h1 className="text-2xl font-bold text-base-content mb-1">{activity.name}</h1>
          <p className="text-primary font-semibold">{activity.credits} CR per session</p>
        </div>

        {/* DotMatrix Transaction Widget */}
        {txHash && (
          <div className="mb-6">
            <ActivityTxWidget
              txHash={txHash}
              creditsSpent={activity.credits}
              chainId={targetNetwork.id}
              networkName={targetNetwork.name}
              onComplete={handleComplete}
            />
          </div>
        )}

        {/* Access Granted State */}
        {accessGranted && flowState === "success" ? (
          <div className="bg-base-100 rounded-2xl p-6 text-center border border-success/30 shadow-lg">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-base-content mb-2">Access Granted!</h2>
            <p className="text-base-content/60 text-sm mb-4">Enjoy your {activity.name} session</p>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-content font-medium rounded-full transition-all duration-200"
            >
              Done
            </button>
          </div>
        ) : (
          /* Tap Button Area */
          <div className="bg-base-100 rounded-2xl p-6 border border-base-300 shadow-lg">
            {/* Balance Display */}
            <div className="flex items-center justify-between mb-6 px-2">
              <span className="text-base-content/60 text-sm">Your Balance</span>
              <span className="text-lg font-bold text-base-content">{formattedBalance.toFixed(0)} CR</span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl mb-4">
                <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                <span className="text-error text-xs">{error}</span>
              </div>
            )}

            {/* Insufficient Balance Warning */}
            {insufficientBalance && !error && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-warning/10 border border-warning/30 rounded-xl mb-4">
                <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                <span className="text-warning text-xs">Insufficient credits. You need {activity.credits} CR.</span>
              </div>
            )}

            {/* Tap Button */}
            <button
              onClick={handleTap}
              disabled={isProcessing || insufficientBalance}
              className={`
                w-full py-6 rounded-2xl font-bold text-lg
                transition-all duration-200
                flex flex-col items-center justify-center gap-2
                ${
                  isProcessing
                    ? "bg-primary/20 text-primary cursor-wait"
                    : insufficientBalance
                      ? "bg-base-300 text-base-content/30 cursor-not-allowed"
                      : "bg-primary hover:bg-primary/90 text-primary-content shadow-lg hover:shadow-xl"
                }
              `}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-sm">
                    {flowState === "tapping"
                      ? "Tap your chip..."
                      : flowState === "signing"
                        ? "Signing..."
                        : flowState === "submitting"
                          ? "Sending..."
                          : "Confirming..."}
                  </span>
                </>
              ) : (
                <>
                  <svg
                    className="w-8 h-8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
                    <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
                    <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8" />
                    <path d="M16.37 2a20.16 20.16 0 0 1 0 20" />
                  </svg>
                  <span>TAP TO ACCESS</span>
                </>
              )}
            </button>

            {/* Cost Info */}
            <p className="text-center text-base-content/40 text-xs mt-4">
              This will deduct {activity.credits} CR from your balance
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

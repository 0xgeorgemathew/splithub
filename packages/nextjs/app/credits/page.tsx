"use client";

import { useCallback, useState } from "react";
import { Coins, Gamepad2, Wallet } from "lucide-react";
import { ActivitySelector } from "~~/components/activity";
import { POSFullScreen } from "~~/components/credits/POSFullScreen";
import { useCreditBalance, useCreditPurchase } from "~~/hooks/credits";

type TabView = "pos" | "activities";

export default function CreditsPage() {
  const [amount, setAmount] = useState(25);
  const [activeTab, setActiveTab] = useState<TabView>("pos");

  const { formattedBalance, refetchBalance, isConnected } = useCreditBalance();
  const {
    flowState,
    error,
    txHash,
    confirmations,
    targetConfirmations,
    blockNumber,
    creditsMinted,
    networkName,
    creditTokenAddress,
    purchaseCredits,
    reset,
  } = useCreditPurchase({
    onSuccess: () => {
      refetchBalance();
    },
  });

  const handleTap = useCallback(() => {
    purchaseCredits(amount.toString());
  }, [purchaseCredits, amount]);

  const handleClose = useCallback(() => {
    reset();
    refetchBalance();
  }, [reset, refetchBalance]);

  // If wallet not connected, show connect message
  if (!isConnected || !creditTokenAddress) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-black flex items-center justify-center pb-28">
        <div className="flex flex-col items-center text-center px-6">
          <div className="w-20 h-20 rounded-full bg-base-300/50 flex items-center justify-center mb-6">
            <Wallet className="w-10 h-10 text-base-content/30" />
          </div>
          <h2 className="text-xl font-bold text-base-content mb-2">Connect Wallet</h2>
          <p className="text-base-content/50 text-sm">Connect your wallet to purchase credits</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-black flex flex-col">
      {/* Tab Switcher */}
      <div className="flex justify-center pt-4 px-4">
        <div className="flex bg-base-300/30 rounded-full p-1 border border-base-300/50">
          <button
            onClick={() => setActiveTab("pos")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all
              ${
                activeTab === "pos"
                  ? "bg-primary text-primary-content shadow-md"
                  : "text-base-content/60 hover:text-base-content"
              }
            `}
          >
            <Coins className="w-4 h-4" />
            Buy Credits
          </button>
          <button
            onClick={() => setActiveTab("activities")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all
              ${
                activeTab === "activities"
                  ? "bg-primary text-primary-content shadow-md"
                  : "text-base-content/60 hover:text-base-content"
              }
            `}
          >
            <Gamepad2 className="w-4 h-4" />
            Activities
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {activeTab === "pos" ? (
          <POSFullScreen
            isOpen={true}
            onClose={handleClose}
            amount={amount}
            onAmountChange={setAmount}
            balance={formattedBalance}
            onTap={handleTap}
            onReset={reset}
            flowState={flowState}
            error={error}
            txHash={txHash}
            confirmations={confirmations}
            targetConfirmations={targetConfirmations}
            blockNumber={blockNumber}
            creditsMinted={creditsMinted}
            networkName={networkName}
          />
        ) : (
          <div className="px-4 pt-6 pb-28">
            {/* Balance Display */}
            <div className="bg-base-100/10 rounded-xl p-4 mb-6 border border-base-300/30">
              <div className="flex items-center justify-between">
                <span className="text-base-content/60 text-sm">Your Balance</span>
                <span className="text-2xl font-bold text-primary">{formattedBalance.toFixed(0)} CR</span>
              </div>
            </div>

            {/* Activities Header */}
            <h2 className="text-lg font-bold text-base-content mb-4">Activity Zone</h2>
            <p className="text-base-content/50 text-sm mb-6">Select an activity to spend your credits</p>

            {/* Activity Grid */}
            <ActivitySelector />
          </div>
        )}
      </div>
    </div>
  );
}

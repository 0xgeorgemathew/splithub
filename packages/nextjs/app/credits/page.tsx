"use client";

import { useCallback, useState } from "react";
import { Wallet } from "lucide-react";
import { POSFullScreen } from "~~/components/credits/POSFullScreen";
import { useCreditBalance, useCreditPurchase } from "~~/hooks/credits";

export default function CreditsPage() {
  const [amount, setAmount] = useState(25);

  const { formattedBalance, refetchBalance } = useCreditBalance();
  const {
    flowState,
    error,
    txHash,
    confirmations,
    targetConfirmations,
    blockNumber,
    creditsMinted,
    networkName,
    isConnected,
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

  // If wallet not connected, show connect message inside terminal area
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
    <div className="min-h-[calc(100vh-64px)] bg-black">
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
    </div>
  );
}

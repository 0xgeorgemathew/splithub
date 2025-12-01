"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { POSFullScreen } from "~~/components/credits/POSFullScreen";
import { useCreditPurchase } from "~~/hooks/credits";

export default function CreditsPage() {
  const [amount, setAmount] = useState(25);

  const { flowState, error, txHash, creditsMinted, newBalance, networkName, purchaseCredits, reset } =
    useCreditPurchase({});

  const handleTap = useCallback(() => {
    purchaseCredits(amount.toString());
  }, [purchaseCredits, amount]);

  const handleClose = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-black flex flex-col">
      {/* Full POS Terminal */}
      <POSFullScreen
        isOpen={true}
        onClose={handleClose}
        amount={amount}
        onAmountChange={setAmount}
        onTap={handleTap}
        onReset={reset}
        flowState={flowState}
        error={error}
        txHash={txHash}
        creditsMinted={creditsMinted}
        newBalance={newBalance}
        networkName={networkName}
      />

      {/* Small Activities Navigation Button */}
      <Link href="/activities" className="activities-nav-btn" aria-label="View Activities">
        <Gamepad2 className="w-6 h-6" />
      </Link>
    </div>
  );
}

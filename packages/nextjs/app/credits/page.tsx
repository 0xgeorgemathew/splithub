"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { POSFullScreen } from "~~/components/credits/POSFullScreen";
import { useCreditPurchase } from "~~/hooks/credits";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

export default function CreditsPage() {
  const [amount, setAmount] = useState(25);
  const { targetNetwork } = useTargetNetwork();
  const router = useRouter();

  const { flowState, error, txHash, creditsMinted, newBalance, purchaseCredits, reset } = useCreditPurchase({});

  const handleTap = useCallback(() => {
    purchaseCredits(amount.toString());
  }, [purchaseCredits, amount]);

  const handleClose = useCallback(() => {
    reset();
    router.back();
  }, [reset, router]);

  return (
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
      chainId={targetNetwork.id}
    />
  );
}

"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { POSFullScreen } from "~~/components/credits/POSFullScreen";
import { Activity, getAllActivities } from "~~/config/activities";
import { useCreditPurchase } from "~~/hooks/credits";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

export default function CreditsPage() {
  const [amount, setAmount] = useState(1);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const { targetNetwork } = useTargetNetwork();
  const router = useRouter();
  const activities = getAllActivities();

  const { flowState, error, txHash, creditsMinted, newBalance, purchaseCredits, reset } = useCreditPurchase({});

  const handleSelectActivity = useCallback((activity: Activity) => {
    setSelectedActivity(activity);
  }, []);

  const handleActivityBack = useCallback(() => {
    setSelectedActivity(null);
  }, []);

  const handleTap = useCallback(() => {
    purchaseCredits(amount.toString());
  }, [purchaseCredits, amount]);

  const handleClose = useCallback(() => {
    reset();
    setIsOpen(false);
  }, [reset]);

  // Navigate after exit animation completes
  const handleExitComplete = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
      {isOpen && (
        <POSFullScreen
          key="pos-terminal"
          isOpen={isOpen}
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
          activities={activities}
          onSelectActivity={handleSelectActivity}
          selectedActivity={selectedActivity}
          onActivityBack={handleActivityBack}
        />
      )}
    </AnimatePresence>
  );
}

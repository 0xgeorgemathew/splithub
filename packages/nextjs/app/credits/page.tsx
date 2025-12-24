"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { POSFullScreen } from "~~/components/credits/POSFullScreen";
import { VenueCard } from "~~/components/credits/VenueCard";
import { Activity, getAllActivities } from "~~/config/activities";
import { useCreditPurchase } from "~~/hooks/credits";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

// Stagger animation for venue cards
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function CreditsPage() {
  const [amount, setAmount] = useState(1);
  const [showPOS, setShowPOS] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const { targetNetwork } = useTargetNetwork();
  const router = useRouter();
  const activities = getAllActivities();

  const { flowState, error, txHash, creditsMinted, newBalance, purchaseCredits, reset } = useCreditPurchase({});

  const handleLaunchPOS = useCallback(() => {
    setShowPOS(true);
  }, []);

  const handleSelectActivity = useCallback((activity: Activity) => {
    setSelectedActivity(activity);
  }, []);

  const handleActivityBack = useCallback(() => {
    setSelectedActivity(null);
  }, []);

  const handleTap = useCallback(() => {
    purchaseCredits(amount.toString());
  }, [purchaseCredits, amount]);

  const handleClosePOS = useCallback(() => {
    reset();
    setShowPOS(false);
  }, [reset]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // POS Fullscreen overlay
  if (showPOS) {
    return (
      <AnimatePresence mode="wait">
        <POSFullScreen
          key="pos-terminal"
          isOpen={showPOS}
          onClose={handleClosePOS}
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
      </AnimatePresence>
    );
  }

  // Play Zone Venue Launcher Interface
  return (
    <div className="px-4 py-4 pb-24">
      {/* Header */}
      <motion.header
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <button
          onClick={handleBack}
          className="mb-4 text-xs font-medium tracking-wide text-base-content/50 transition-colors hover:text-primary"
        >
          &larr; BACK
        </button>

        <h1 className="text-3xl font-bold tracking-tight text-base-content">
          Select <span className="text-primary">Venue</span>
        </h1>
        <p className="mt-2 text-sm text-base-content/60">Launch point-of-sale terminal</p>
      </motion.header>

      {/* Venue Cards */}
      <motion.main variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <VenueCard name="SplitHub HQ" status="ready" onClick={handleLaunchPOS} />
        </motion.div>
      </motion.main>
    </div>
  );
}

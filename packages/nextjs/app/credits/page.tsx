"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Store } from "lucide-react";
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

// Breathing animation for header
const breathingVariants = {
  animate: {
    opacity: [0.9, 1, 0.9],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
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
    <div className="venue-launcher relative min-h-screen overflow-hidden bg-[var(--venue-bg)]">
      {/* Atmospheric gold orb - spotlight effect */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-[100px]"
        style={{
          background: "radial-gradient(circle, #f2a900 0%, transparent 70%)",
        }}
      />

      {/* Secondary ambient orb - lower */}
      <div
        className="pointer-events-none absolute bottom-20 left-1/4 h-[300px] w-[300px] -translate-x-1/2 rounded-full opacity-5 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #f2a900 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <motion.header
        className="relative z-10 px-4 pb-4 pt-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <button
          onClick={handleBack}
          className="mb-6 font-jetbrains text-xs font-medium tracking-widest text-[var(--venue-text-muted)] transition-colors hover:text-[var(--venue-accent)]"
        >
          &larr; BACK
        </button>

        {/* Breathing header - pulsing neon sign effect */}
        <motion.div variants={breathingVariants} animate="animate">
          <h1 className="font-bricolage text-5xl font-extrabold tracking-tight text-[var(--venue-text)] sm:text-6xl">
            Select
            <br />
            <span className="text-[var(--venue-accent)]">Venue</span>
          </h1>
        </motion.div>

        {/* Typewriter subtitle with blinking cursor */}
        <motion.p
          className="mt-3 font-jetbrains text-sm text-[var(--venue-text-muted)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          {"//LAUNCH POINT-OF-SALE TERMINAL"}
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[var(--venue-accent)]" />
        </motion.p>
      </motion.header>

      {/* Venue Cards */}
      <motion.main
        className="relative z-10 px-4 pb-24 pt-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <VenueCard name="SplitHub HQ" status="ready" icon={Store} onClick={handleLaunchPOS} />
        </motion.div>
      </motion.main>

      {/* Bottom status bar */}
      <motion.footer
        className="fixed bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-[var(--venue-bg)]/80 px-4 py-4 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--venue-accent)]" />
            <span className="font-jetbrains text-[10px] tracking-widest text-[var(--venue-text-muted)]">
              SYS.ONLINE
            </span>
          </div>
          <span className="font-jetbrains text-[10px] tracking-widest text-[var(--venue-text-muted)]">v1.0.0</span>
        </div>
      </motion.footer>
    </div>
  );
}

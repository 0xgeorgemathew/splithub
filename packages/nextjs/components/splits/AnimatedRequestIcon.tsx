"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BanknoteArrowDown, Bell, Check, Loader2 } from "lucide-react";
import { iconVariants } from "~~/components/shared/animations/common.animations";

interface AnimatedRequestIconProps {
  /** Whether the request is currently being processed */
  isProcessing: boolean;
  /** Whether the request was successful (shows checkmark) */
  isSuccess: boolean;
  /** Whether there's an existing valid request (shows bell) */
  hasValidRequest: boolean;
  /** Callback when exit animation completes */
  onComplete?: () => void;
}

/**
 * Animated icon component for payment request state transitions.
 * Flow: Banknote → Loading → Check → Bell (new request)
 * Flow: Bell → Loading → Check → Bell (reminder)
 */
export const AnimatedRequestIcon = ({
  isProcessing,
  isSuccess,
  hasValidRequest,
  onComplete,
}: AnimatedRequestIconProps) => {
  // Determine which icon to show based on state
  const getIconKey = () => {
    if (isProcessing) return "loading";
    if (isSuccess) return "check";
    if (hasValidRequest) return "bell";
    return "banknote";
  };

  return (
    <AnimatePresence mode="wait" onExitComplete={onComplete}>
      <motion.div
        key={getIconKey()}
        variants={iconVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex items-center justify-center"
      >
        {isProcessing ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 className="w-5 h-5 text-[#00E0B8]" />
          </motion.div>
        ) : isSuccess ? (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.3 }}>
            <Check className="w-5 h-5 text-[#00E0B8]" />
          </motion.div>
        ) : hasValidRequest ? (
          <Bell className="w-5 h-5 text-[#00E0B8]" />
        ) : (
          <BanknoteArrowDown className="w-5 h-5 text-[#00E0B8]/70" />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

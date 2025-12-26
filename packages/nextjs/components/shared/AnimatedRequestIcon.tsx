"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BanknoteArrowDown, Bell, Check } from "lucide-react";
import { ICON_VARIANTS, TWEEN_CONFIGS } from "~~/constants/app.constants";

interface AnimatedRequestIconProps {
  /** Whether a request action is currently processing */
  isProcessing: boolean;
  /** Whether the action completed successfully (shows checkmark) */
  isSuccess: boolean;
  /** Whether a valid pending request exists (shows bell) */
  hasValidRequest: boolean;
}

/**
 * Animated icon component for payment request state transitions
 *
 * Icon flow based on state:
 * - Default (no request): BanknoteArrowDown - "Create request"
 * - Has request: Bell - "Send reminder"
 * - Processing: Spinning Bell
 * - Success: Animated Check
 */
export function AnimatedRequestIcon({ isProcessing, isSuccess, hasValidRequest }: AnimatedRequestIconProps) {
  const getIconKey = () => {
    if (isProcessing) return "loading";
    if (isSuccess) return "check";
    if (hasValidRequest) return "bell";
    return "banknote";
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={getIconKey()}
        variants={ICON_VARIANTS}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={TWEEN_CONFIGS.icon}
        className="flex items-center justify-center"
      >
        {isProcessing ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Bell className="w-5 h-5 text-[#00E0B8]" />
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
}

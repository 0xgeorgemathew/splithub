"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import { SettleFlow } from "./SettleFlow";
import { SettleModalProps } from "./types";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export function SettleModal({ isOpen, onClose, params, onSuccess, onError }: SettleModalProps) {
  const { recipientInfo } = params;

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Handle success - no auto-dismiss, user clicks close button
  const handleSuccess = useCallback(
    async (txHash: string) => {
      if (onSuccess) {
        await onSuccess(txHash);
      }
    },
    [onSuccess],
  );

  if (!isOpen) return null;

  const displayName = recipientInfo?.name || (params.memo ? params.memo.replace("Settlement with ", "") : "Recipient");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-xs bg-gradient-to-b from-base-100 to-base-200 rounded-3xl shadow-2xl border border-white/10 my-4"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-base-100/50 hover:bg-base-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-base-content/70" />
        </button>

        {/* Header with Avatar */}
        <div className="pt-5 pb-2 px-4 text-center">
          {/* Avatar with Glow */}
          {recipientInfo?.profileUrl && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-3 relative inline-block"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-warning/30 blur-xl scale-150" />
              <Image
                src={recipientInfo.profileUrl}
                alt={displayName}
                width={56}
                height={56}
                className="relative w-14 h-14 rounded-full ring-2 ring-warning/30 ring-offset-2 ring-offset-base-100"
              />
            </motion.div>
          )}

          {/* Text Group - Tightly Spaced */}
          <div className="space-y-0">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-[9px] uppercase tracking-widest text-base-content/50"
            >
              You&apos;re paying
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg font-bold text-base-content"
            >
              {displayName}
            </motion.h2>
          </div>

          {/* Twitter Handle as Verified Pill */}
          {recipientInfo?.twitterHandle && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-warning/10 rounded-full"
            >
              <span className="text-[10px] font-medium text-warning">@{recipientInfo.twitterHandle}</span>
            </motion.div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          <SettleFlow params={params} onSuccess={handleSuccess} onError={onError} onClose={onClose} />
        </div>
      </motion.div>
    </div>
  );
}

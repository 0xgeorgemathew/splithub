"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import { SettleFlow } from "./SettleFlow";
import { SettleModalProps } from "./types";
import { motion } from "framer-motion";
import { AtSign, X } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-3 pb-28 sm:pt-4 sm:pb-24 md:pb-6">
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
        className="relative my-auto w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-base-100 to-base-200 shadow-2xl max-h-[min(680px,calc(100dvh-9rem))] sm:max-h-[min(720px,calc(100dvh-7rem))]"
      >
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-start gap-3">
            {recipientInfo?.profileUrl && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="relative mt-0.5 flex-shrink-0"
              >
                <div className="absolute inset-0 rounded-full bg-warning/25 blur-xl scale-150" />
                <Image
                  src={recipientInfo.profileUrl}
                  alt={displayName}
                  width={46}
                  height={46}
                  className="relative h-[46px] w-[46px] rounded-full ring-2 ring-warning/30 ring-offset-2 ring-offset-base-100"
                />
              </motion.div>
            )}

            <div className="min-w-0 flex-1 text-left">
              <motion.h2
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="truncate pt-0.5 text-[1.65rem] font-bold leading-none text-base-content"
              >
                {displayName}
              </motion.h2>

              {recipientInfo?.twitterHandle && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-1 inline-flex items-center gap-1 text-warning"
                >
                  <AtSign className="h-3.5 w-3.5 text-warning/80" />
                  <span className="text-[0.95rem] font-medium leading-none">{recipientInfo.twitterHandle}</span>
                </motion.div>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-full bg-base-100/50 p-1.5 transition-colors hover:bg-base-100"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-base-content/70" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          <SettleFlow params={params} onSuccess={handleSuccess} onError={onError} onClose={onClose} />
        </div>
      </motion.div>
    </div>
  );
}

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

  // Handle success with auto-dismiss
  const handleSuccess = useCallback(
    async (txHash: string) => {
      if (onSuccess) {
        await onSuccess(txHash);
      }
      setTimeout(() => {
        onClose();
      }, 2000);
    },
    [onSuccess, onClose],
  );

  if (!isOpen) return null;

  const displayName = recipientInfo?.name || (params.memo ? params.memo.replace("Settlement with ", "") : "Recipient");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-xs bg-base-200 rounded-3xl shadow-2xl"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-base-100/50 hover:bg-base-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-base-content/70" />
        </button>

        {/* Compact Header with Avatar */}
        <div className="pt-4 pb-1 px-4 text-center">
          {/* Avatar */}
          {recipientInfo?.profileUrl && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-1.5"
            >
              <Image
                src={recipientInfo.profileUrl}
                alt={displayName}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full mx-auto ring-2 ring-warning/20 ring-offset-2 ring-offset-base-200"
              />
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-[10px] text-base-content/60 mb-0.5"
          >
            You&apos;re paying
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base font-bold text-base-content"
          >
            {displayName}
          </motion.h2>

          {/* Twitter Handle */}
          {recipientInfo?.twitterHandle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-[10px] text-warning/70"
            >
              @{recipientInfo.twitterHandle}
            </motion.p>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          <SettleFlow params={params} onSuccess={handleSuccess} onError={onError} />
        </div>
      </motion.div>
    </div>
  );
}

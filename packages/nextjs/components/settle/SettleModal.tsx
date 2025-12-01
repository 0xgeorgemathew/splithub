"use client";

import { useCallback, useEffect } from "react";
import { SettleFlow } from "./SettleFlow";
import { SettleModalProps } from "./types";
import { X } from "lucide-react";

export function SettleModal({ isOpen, onClose, params, onSuccess, onError }: SettleModalProps) {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Handle success with auto-dismiss
  const handleSuccess = useCallback(
    (txHash: string) => {
      // Call parent success handler
      if (onSuccess) {
        onSuccess(txHash);
      }

      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    },
    [onSuccess, onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-base-200 rounded-3xl shadow-2xl fade-in-up overflow-y-auto max-h-[85vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-base-100/50 hover:bg-base-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-base-content/70" />
        </button>

        {/* Header */}
        <div className="pt-6 pb-2 px-6 text-center">
          <h2 className="text-lg font-semibold text-base-content">Payment Request</h2>
          {params.memo && <p className="text-sm text-base-content/60 mt-1">{params.memo}</p>}
        </div>

        {/* Content */}
        <div className="px-6 pb-8">
          <SettleFlow params={params} onSuccess={handleSuccess} onError={onError} />
        </div>
      </div>
    </div>
  );
}

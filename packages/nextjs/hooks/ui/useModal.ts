"use client";

import { useCallback, useEffect, useState } from "react";

interface UseModalOptions {
  /** Callback when modal is closed via escape key */
  onEscapeClose?: () => void;
  /** Whether to prevent closing while in a loading/submitting state */
  preventCloseWhileLoading?: boolean;
}

interface UseModalReturn {
  isOpen: boolean;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook for managing modal state with escape key handling and body overflow control.
 * Extracted pattern from ExpenseModal and SettleModal.
 */
export function useModal(options: UseModalOptions = {}): UseModalReturn {
  const { onEscapeClose, preventCloseWhileLoading = false } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => {
    if (preventCloseWhileLoading && isLoading) return;
    setIsOpen(false);
    onEscapeClose?.();
  }, [preventCloseWhileLoading, isLoading, onEscapeClose]);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  // Handle escape key and body overflow
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (preventCloseWhileLoading && isLoading) return;
        close();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isLoading, preventCloseWhileLoading, close]);

  return { isOpen, isLoading, setLoading: setIsLoading, open, close, toggle };
}

/**
 * Hook specifically for modal escape key handling without state management.
 * Use this when modal state is managed externally.
 */
export function useModalEscapeKey(
  isOpen: boolean,
  onClose: () => void,
  options: { preventCloseWhileLoading?: boolean; isLoading?: boolean } = {},
) {
  const { preventCloseWhileLoading = false, isLoading = false } = options;

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (preventCloseWhileLoading && isLoading) return;
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isLoading, preventCloseWhileLoading, onClose]);
}

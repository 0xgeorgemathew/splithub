"use client";

import { useCallback, useState } from "react";

/**
 * Generic modal state hook with typed data
 *
 * Manages open/close state and associated data for modals.
 * Use this to consolidate modal state variables into a single hook.
 *
 * @example
 * const settleModal = useModalState<Friend>();
 *
 * // Open with data
 * settleModal.open(selectedFriend);
 *
 * // In modal component
 * <Modal isOpen={settleModal.isOpen} friend={settleModal.data}>
 */
export function useModalState<T = unknown>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((modalData?: T) => {
    setData(modalData ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Delay clearing data to allow close animation
    setTimeout(() => setData(null), 300);
  }, []);

  const toggle = useCallback(
    (modalData?: T) => {
      if (isOpen) {
        close();
      } else {
        open(modalData);
      }
    },
    [isOpen, open, close],
  );

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
  };
}

/**
 * Hook return type for external use
 */
export type ModalState<T = unknown> = ReturnType<typeof useModalState<T>>;

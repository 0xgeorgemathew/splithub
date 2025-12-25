"use client";

import { useCallback, useState } from "react";
import { isAddress } from "viem";
import { TOKENS } from "~~/config/tokens";

/**
 * Amount slot for multi-settle form
 */
export interface AmountSlot {
  id: string;
  amount: string;
}

/**
 * Multi-settle form configuration
 */
export interface MultiSettleConfig {
  recipient: `0x${string}`;
  token: `0x${string}`;
  amounts: string[];
  memo?: string;
}

const DEFAULT_TOKEN = TOKENS.USDC;

/**
 * Hook to manage multi-settle form state
 *
 * Handles slot management, validation, and form state.
 */
export function useMultiSettleForm(defaultRecipient?: string) {
  const [recipient, setRecipient] = useState<string>(defaultRecipient || "");
  const [token, setToken] = useState<string>(DEFAULT_TOKEN);
  const [memo, setMemo] = useState("");
  const [slots, setSlots] = useState<AmountSlot[]>([{ id: "1", amount: "" }]);

  /**
   * Add a new amount slot
   */
  const addSlot = useCallback(() => {
    setSlots(prev => [...prev, { id: Date.now().toString(), amount: "" }]);
  }, []);

  /**
   * Remove a slot by ID (keeps at least one)
   */
  const removeSlot = useCallback((id: string) => {
    setSlots(prev => (prev.length > 1 ? prev.filter(s => s.id !== id) : prev));
  }, []);

  /**
   * Update a slot's amount
   */
  const updateSlot = useCallback((id: string, amount: string) => {
    setSlots(prev => prev.map(s => (s.id === id ? { ...s, amount } : s)));
  }, []);

  /**
   * Check if configuration is valid
   */
  const isValid = useCallback(() => {
    if (!isAddress(recipient) || !isAddress(token)) return false;
    return slots.every(s => s.amount && parseFloat(s.amount) > 0);
  }, [recipient, token, slots]);

  /**
   * Calculate total amount across all slots
   */
  const totalAmount = slots.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  /**
   * Get validated configuration
   */
  const getConfig = useCallback((): MultiSettleConfig | null => {
    if (!isValid()) return null;

    return {
      recipient: recipient as `0x${string}`,
      token: token as `0x${string}`,
      amounts: slots.map(s => s.amount),
      memo: memo || undefined,
    };
  }, [recipient, token, slots, memo, isValid]);

  /**
   * Reset form to initial state
   */
  const reset = useCallback(() => {
    setRecipient(defaultRecipient || "");
    setToken(DEFAULT_TOKEN);
    setMemo("");
    setSlots([{ id: "1", amount: "" }]);
  }, [defaultRecipient]);

  return {
    // State
    recipient,
    token,
    memo,
    slots,
    totalAmount,

    // Setters
    setRecipient,
    setToken,
    setMemo,

    // Slot management
    addSlot,
    removeSlot,
    updateSlot,

    // Validation
    isValid: isValid(),
    getConfig,

    // Actions
    reset,
  };
}

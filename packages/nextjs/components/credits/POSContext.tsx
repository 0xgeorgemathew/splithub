"use client";

import { type ReactNode, createContext, useCallback, useContext, useState } from "react";
import { Activity } from "~~/config/activities";
import { CreditFlowState, useCreditPurchase } from "~~/hooks/credits/useCreditPurchase";

/**
 * POS Terminal Context Value
 *
 * Provides all state and actions needed by POS terminal components.
 * This eliminates prop drilling through POSFullScreen.
 */
interface POSContextValue {
  // Configuration
  chainId: number;
  activities: Activity[];

  // Amount state
  amount: number;
  setAmount: (amount: number) => void;

  // Credit purchase flow
  flowState: CreditFlowState;
  error?: string;
  txHash?: string | null;
  creditsMinted: string | null;
  newBalance: string | null;

  // Actions
  purchaseCredits: () => void;
  reset: () => void;

  // Activity selection (for venue activities)
  selectedActivity: Activity | null;
  selectActivity: (activity: Activity) => void;
  clearActivity: () => void;

  // Modal/visibility
  isOpen: boolean;
  close: () => void;

  // Transaction state - true when transaction is in progress
  isProcessing: boolean;
}

const POSContext = createContext<POSContextValue | null>(null);

interface POSProviderProps {
  children: ReactNode;
  /** Chain ID for transaction display */
  chainId: number;
  /** Available activities */
  activities?: Activity[];
  /** Callback when terminal is closed */
  onClose?: () => void;
}

/**
 * POS Terminal Provider
 *
 * Wraps the POS terminal UI and provides all state via context.
 * Child components can access state with usePOS() hook.
 *
 * @example
 * ```tsx
 * <POSProvider chainId={84532} onClose={handleClose}>
 *   <POSFullScreen />
 * </POSProvider>
 * ```
 */
export function POSProvider({ children, chainId, activities = [], onClose }: POSProviderProps) {
  const [amount, setAmount] = useState(1);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const { flowState, error, txHash, creditsMinted, newBalance, purchaseCredits, reset, isProcessing } =
    useCreditPurchase({});

  const handlePurchase = useCallback(() => {
    purchaseCredits(amount.toString());
  }, [purchaseCredits, amount]);

  const handleClose = useCallback(() => {
    reset();
    setIsOpen(false);
    onClose?.();
  }, [reset, onClose]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const selectActivity = useCallback((activity: Activity) => {
    setSelectedActivity(activity);
  }, []);

  const clearActivity = useCallback(() => {
    setSelectedActivity(null);
  }, []);

  const value: POSContextValue = {
    chainId,
    activities,
    amount,
    setAmount,
    flowState,
    error,
    txHash,
    creditsMinted,
    newBalance,
    purchaseCredits: handlePurchase,
    reset: handleReset,
    selectedActivity,
    selectActivity,
    clearActivity,
    isOpen,
    close: handleClose,
    isProcessing,
  };

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
}

/**
 * Hook to access POS terminal context
 *
 * @throws Error if used outside of POSProvider
 *
 * @example
 * ```tsx
 * function POSAmountEntry() {
 *   const { amount, setAmount, purchaseCredits } = usePOS();
 *   // ...
 * }
 * ```
 */
export function usePOS(): POSContextValue {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error("usePOS must be used within a POSProvider");
  }
  return context;
}

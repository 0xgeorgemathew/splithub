"use client";

import { useCallback, useState } from "react";
import { TOKENS } from "~~/config/tokens";
import { ANIMATION_DELAYS } from "~~/constants/ui";
import { createExpense } from "~~/services/expenseService";

interface Friend {
  address: string;
  name: string;
  twitterHandle?: string;
  twitterProfileUrl?: string;
}

interface UseExpenseSubmitParams {
  /** User's wallet address */
  userWallet: string | undefined;
  /** Expense description */
  description: string;
  /** Expense amount as string */
  amount: string;
  /** Selected friends to split with */
  selectedFriends: Friend[];
  /** Callback on successful submission */
  onSuccess: () => void;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback to reset the form */
  onReset: () => void;
}

interface UseExpenseSubmitReturn {
  /** Submit the expense */
  submit: () => Promise<void>;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Whether submission was successful */
  isSuccess: boolean;
  /** Error message if submission failed */
  error: string | null;
  /** Clear the error */
  clearError: () => void;
}

/**
 * Hook for handling expense creation submission.
 * Extracted from ExpenseModal handleSubmit logic.
 */
export function useExpenseSubmit({
  userWallet,
  description,
  amount,
  selectedFriends,
  onSuccess,
  onClose,
  onReset,
}: UseExpenseSubmitParams): UseExpenseSubmitReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const submit = useCallback(async () => {
    if (!userWallet || !description || !amount || selectedFriends.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const participantWallets = [userWallet, ...selectedFriends.map(f => f.address)];

      await createExpense({
        creatorWallet: userWallet,
        description,
        totalAmount: parseFloat(amount),
        tokenAddress: TOKENS.USDC,
        participantWallets,
      });

      setIsSuccess(true);

      // Auto-close after success animation
      setTimeout(() => {
        onReset();
        setIsSuccess(false);
        setIsSubmitting(false);
        onSuccess();
        onClose();
      }, ANIMATION_DELAYS.SUCCESS_DISPLAY);
    } catch (err) {
      console.error("Error creating expense:", err);
      setError(err instanceof Error ? err.message : "Failed to create expense");
      setIsSubmitting(false);
    }
  }, [userWallet, description, amount, selectedFriends, onSuccess, onClose, onReset]);

  return {
    submit,
    isSubmitting,
    isSuccess,
    error,
    clearError,
  };
}

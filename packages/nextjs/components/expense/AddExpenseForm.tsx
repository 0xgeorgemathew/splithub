"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AmountInput } from "./AmountInput";
import { FriendPill } from "./FriendPill";
import { FriendSelector } from "./FriendSelector";
import { SplitSummary } from "./SplitSummary";
import { useExpenseForm } from "./hooks/useExpenseForm";
import { CheckCircle2, FileText, Plus } from "lucide-react";
import { useAccount } from "wagmi";
import { createExpense } from "~~/services/expenseService";

export const AddExpenseForm = () => {
  const router = useRouter();
  const { address: userWallet } = useAccount();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    description,
    setDescription,
    amount,
    setAmount,
    selectedFriends,
    addFriend,
    removeFriend,
    isValid,
    participantCount,
  } = useExpenseForm();

  const handleSubmit = async () => {
    if (!isValid || !userWallet) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get all participant wallet addresses (selected friends + user)
      const participantWallets = [userWallet, ...selectedFriends.map(f => f.address)];

      // Create expense in database
      await createExpense({
        creatorWallet: userWallet,
        description,
        totalAmount: parseFloat(amount),
        tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
        participantWallets,
      });

      setIsSuccess(true);

      // Navigate back to home after success
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err) {
      console.error("Error creating expense:", err);
      setError(err instanceof Error ? err.message : "Failed to create expense");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-4 success-glow">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-base-content mb-2">Expense Added!</h2>
        <p className="text-base-content/70 text-center">Your expense has been created successfully</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="space-y-3">
        {/* Friends Section */}
        <div>
          <label className="text-sm font-medium text-base-content/70 mb-2 block">With you and:</label>

          {/* Selected friends */}
          {selectedFriends.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5">
              {selectedFriends.map(friend => (
                <FriendPill
                  key={friend.address}
                  address={friend.address}
                  name={friend.name}
                  onRemove={() => removeFriend(friend.address)}
                />
              ))}
            </div>
          )}

          {/* Add friend button */}
          <button
            onClick={() => setIsSelectorOpen(true)}
            className="w-full h-11 px-3 bg-base-100/50 hover:bg-base-100 border border-dashed border-base-300/60 hover:border-primary/30 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-base-content/80">Add friend</span>
          </button>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-base-content/70 mb-2 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-primary/80" />
            <span>Description</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Dinner, groceries, etc."
            className="w-full h-11 px-3 bg-base-100 rounded-xl text-base text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-all"
          />
        </div>

        {/* Amount */}
        <AmountInput value={amount} onChange={setAmount} currency="USDC" />

        {/* Split Summary */}
        {participantCount > 0 && (
          <SplitSummary totalAmount={amount} participantCount={participantCount} currency="USDC" />
        )}

        {/* Error Message */}
        {error && (
          <div className="px-3 py-2 bg-error/10 border border-error/30 rounded-lg">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-1">
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting || !userWallet}
            className="w-full h-12 px-6 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-content font-semibold text-base rounded-xl shadow-lg hover:shadow-primary/20 hover:shadow-xl transition-all disabled:shadow-none"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-content/30 border-t-primary-content rounded-full animate-spin" />
                <span>Creating expense...</span>
              </span>
            ) : (
              "Confirm Expense"
            )}
          </button>
        </div>
      </div>

      {/* Friend Selector Modal */}
      <FriendSelector
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelectFriend={friend => {
          addFriend(friend);
        }}
        selectedFriends={selectedFriends}
      />
    </div>
  );
};

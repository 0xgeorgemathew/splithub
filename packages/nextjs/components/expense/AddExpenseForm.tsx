"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AmountInput } from "./AmountInput";
import { FriendPill } from "./FriendPill";
import { FriendSelector } from "./FriendSelector";
import { SplitSummary } from "./SplitSummary";
import { useExpenseForm } from "./hooks/useExpenseForm";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Coins,
  FileText,
  Loader2,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import { useAccount } from "wagmi";
import { createExpense } from "~~/services/expenseService";

export const AddExpenseForm = () => {
  const router = useRouter();
  const { address: userWallet, isConnected } = useAccount();
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
        tokenAddress: "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a", // USDT on Base Sepolia
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

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4 pb-24">
      <div className="w-full max-w-md mx-auto">
        {/* Header with Back Button */}
        {!isSuccess && !isSubmitting && (
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-base-100 hover:bg-base-300 flex items-center justify-center transition-colors shadow-sm"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-base-content" />
            </button>
            <h1 className="text-2xl font-semibold text-base-content">Add Expense</h1>
          </div>
        )}

        {!isConnected ? (
          /* Not Connected State */
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4 shadow-md">
              <Wallet className="w-8 h-8 text-base-content/50" />
            </div>
            <p className="text-base-content/50 text-center">Connect your wallet to add an expense</p>
          </div>
        ) : isSuccess ? (
          /* Success State */
          <div className="flex flex-col items-center justify-center mt-12 fade-in-up">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success/20 mb-6 success-glow">
              <Check className="w-12 h-12 text-success" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-base-content">Expense Added!</h3>

            {/* Expense details */}
            <div className="flex items-center gap-2 px-4 py-2 bg-base-100 border border-success/30 rounded-full mb-2">
              <Coins className="w-4 h-4 text-success" />
              <span className="text-sm font-semibold text-base-content">{amount} USDC</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-base-100 border border-base-300 rounded-full mb-4">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-base-content">Split {participantCount} ways</span>
            </div>

            {/* <p className="text-base-content/60 text-sm">Redirecting to home...</p> */}
          </div>
        ) : isSubmitting ? (
          /* Submitting State */
          <div className="flex flex-col items-center justify-center mt-12">
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-1 text-base-content">Creating Expense...</h3>
            <p className="text-base-content/50 text-sm">Please wait</p>
          </div>
        ) : (
          /* Main Form UI */
          <div className="flex flex-col items-center pt-6">
            {/* Form Card */}
            <div className="w-full bg-base-100 rounded-2xl shadow-lg p-6 space-y-4">
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
                  className="w-full h-11 px-4 bg-base-200 rounded-lg text-base text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              {/* Friends Section */}
              <div>
                <label className="text-sm font-medium text-base-content/70 mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary/80" />
                  <span>Split with</span>
                </label>

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
                  className="w-full h-11 px-3 bg-base-200 hover:bg-base-300 border border-dashed border-base-300/60 hover:border-primary/40 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-base-content/80">Add friend</span>
                </button>
              </div>

              {/* Amount */}
              <AmountInput value={amount} onChange={setAmount} currency="USDC" />

              {/* Split Summary */}
              {participantCount > 0 && (
                <div className="pt-2">
                  <SplitSummary totalAmount={amount} participantCount={participantCount} currency="USDC" />
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-error/10 border border-error/30 rounded-full mt-4 max-w-xs">
                <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                <span className="text-error text-xs">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!isValid || !userWallet}
              className="w-full max-w-xs mt-6 py-3.5 px-6 bg-primary hover:bg-primary/90 text-primary-content font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-5 h-5" />
              Create Expense
            </button>
          </div>
        )}
      </div>

      {/* Friend Selector Modal */}
      <FriendSelector
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelectFriend={friend => {
          addFriend(friend);
        }}
        onRemoveFriend={address => {
          removeFriend(address);
        }}
        selectedFriends={selectedFriends}
      />
    </div>
  );
};

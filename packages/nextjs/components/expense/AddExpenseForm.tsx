"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FriendPill } from "./FriendPill";
import { FriendSelector } from "./FriendSelector";
import { SplitSummary } from "./SplitSummary";
import { useExpenseForm } from "./hooks/useExpenseForm";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CircleDollarSign,
  FileText,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { TOKENS } from "~~/config/tokens";
import { createExpense } from "~~/services/expenseService";

export const AddExpenseForm = () => {
  const router = useRouter();
  const { authenticated, user } = usePrivy();
  // Use Privy's authentication state instead of wagmi's useAccount
  const userWallet = user?.wallet?.address as `0x${string}` | undefined;
  const isConnected = authenticated && !!userWallet;
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
        tokenAddress: TOKENS.USDC,
        participantWallets,
      });

      setIsSuccess(true);

      // Navigate to splits page after success
      setTimeout(() => {
        router.push("/splits");
      }, 1500);
    } catch (err) {
      console.error("Error creating expense:", err);
      setError(err instanceof Error ? err.message : "Failed to create expense");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4 pb-32">
      <div className="w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {!isConnected ? (
            /* Not Connected State */
            <motion.div
              key="not-connected"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center mt-24"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-20 h-20 rounded-3xl bg-base-100 flex items-center justify-center mb-5 shadow-lg"
              >
                <Wallet className="w-10 h-10 text-primary/50" />
              </motion.div>
              <p className="text-base-content/60 text-center font-medium">Connect your wallet to add an expense</p>
            </motion.div>
          ) : isSuccess ? (
            /* Success State */
            <SuccessView key="success" amount={amount} participantCount={participantCount} />
          ) : isSubmitting ? (
            /* Submitting State */
            <motion.div
              key="submitting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center mt-24"
            >
              <div className="relative mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-20 h-20 rounded-full border-3 border-primary/20 border-t-primary"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary/60" />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-1 text-base-content">Creating Expense...</h3>
              <p className="text-base-content/50 text-sm">Just a moment</p>
            </motion.div>
          ) : (
            /* Main Form UI */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-4 mb-6"
              >
                <Link href="/splits">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-11 h-11 rounded-2xl bg-base-100 flex items-center justify-center shadow-md"
                  >
                    <ArrowLeft className="w-5 h-5 text-base-content/70" />
                  </motion.div>
                </Link>
                <h1 className="text-2xl font-bold">New Expense</h1>
              </motion.div>

              {/* Card */}
              <motion.div
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-base-100 rounded-3xl shadow-xl p-6 space-y-5 overflow-hidden relative"
              >
                {/* Amount Input - Hero Element */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex justify-center py-6 bg-base-200/40 rounded-2xl"
                >
                  <div className="relative flex items-baseline">
                    <span className="text-3xl font-bold text-primary mr-1">$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-transparent text-center text-5xl font-bold outline-none w-48 placeholder:text-base-content/20 caret-primary"
                      autoFocus
                    />
                  </div>
                </motion.div>

                {/* Description */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-2"
                >
                  <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What's this for?"
                    className="w-full h-12 px-4 bg-base-200/60 rounded-2xl focus:bg-base-200 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-base font-medium"
                  />
                </motion.div>

                {/* Friends Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3"
                >
                  <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4" /> Split with
                  </label>

                  <motion.div layout className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {selectedFriends.map(friend => (
                        <FriendPill
                          key={friend.address}
                          address={friend.address}
                          name={friend.name}
                          onRemove={() => removeFriend(friend.address)}
                        />
                      ))}
                    </AnimatePresence>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setIsSelectorOpen(true)}
                      className="h-10 px-4 border-2 border-dashed border-base-content/15 rounded-full text-sm font-semibold text-base-content/50 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center gap-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add friend
                    </motion.button>
                  </motion.div>
                </motion.div>

                {/* Split Summary */}
                <AnimatePresence>
                  {participantCount > 1 && amount && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <SplitSummary totalAmount={amount} participantCount={participantCount} currency="USDC" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 px-4 py-3 bg-error/10 border border-error/20 rounded-2xl">
                        <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                        <span className="text-error text-sm font-medium">{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  disabled={!isValid || !userWallet}
                  onClick={handleSubmit}
                  className="w-full py-4 bg-primary text-primary-content rounded-2xl font-bold text-base shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-40 disabled:shadow-none transition-all"
                >
                  <CircleDollarSign className="w-5 h-5" />
                  Create Expense
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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

// Separate Success Component for clean animations
const SuccessView = ({ amount, participantCount }: { amount: string; participantCount: number }) => (
  <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
    className="bg-base-100 p-8 rounded-3xl shadow-xl text-center max-w-sm mx-auto mt-16"
  >
    <div className="w-24 h-24 bg-emerald-500/15 rounded-3xl flex items-center justify-center mx-auto mb-6 relative">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
        className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30"
      >
        <Check className="w-8 h-8 text-white" strokeWidth={3} />
      </motion.div>
    </div>
    <motion.h2
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-2xl font-bold mb-4"
    >
      Expense Added!
    </motion.h2>

    {/* Expense details */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-3"
    >
      <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-emerald-500/10 rounded-full">
        <CircleDollarSign className="w-5 h-5 text-emerald-500" />
        <span className="text-base font-bold text-base-content">${amount} USDC</span>
      </div>

      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-base-200/80 rounded-full">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-base-content">Split {participantCount} ways</span>
      </div>
    </motion.div>

    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="text-sm text-base-content/50 mt-5"
    >
      Taking you back...
    </motion.p>
  </motion.div>
);

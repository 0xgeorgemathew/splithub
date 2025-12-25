"use client";

import { useEffect, useState } from "react";
import { ExpenseAmountInput } from "./ExpenseAmountInput";
import { ExpenseDescriptionInput } from "./ExpenseDescriptionInput";
import { ExpenseFriendChips } from "./ExpenseFriendChips";
import { ExpenseFriendList } from "./ExpenseFriendList";
import { ExpenseFriendSearch } from "./ExpenseFriendSearch";
import { ExpenseModalHeader } from "./ExpenseModalHeader";
import { ExpenseSubmitFooter } from "./ExpenseSubmitFooter";
import { SplitSummary } from "./SplitSummary";
import { Friend, useExpenseForm } from "./hooks/useExpenseForm";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, CircleDollarSign, Sparkles, Users } from "lucide-react";
import { staggerContainer } from "~~/components/shared/animations/common.animations";
import { TOKENS } from "~~/config/tokens";
import { ANIMATION_DELAYS } from "~~/constants/ui";
import { type User, supabase } from "~~/lib/supabase";
import { createExpense } from "~~/services/expenseService";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExpenseModal = ({ isOpen, onClose, onSuccess }: ExpenseModalProps) => {
  const { user } = usePrivy();
  const userWallet = user?.wallet?.address as `0x${string}` | undefined;

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Input focus states
  const [amountFocused, setAmountFocused] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Friend list states
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

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
    reset,
  } = useExpenseForm();

  // Fetch users from Supabase
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .not("chip_address", "is", null)
          .order("twitter_handle");

        if (error) throw error;
        const filtered = (data || []).filter(u => u.wallet_address.toLowerCase() !== userWallet?.toLowerCase());
        setUsers(filtered);
      } catch (err) {
        console.error("Error fetching users:", err);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isOpen, userWallet]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isSubmitting, onClose]);

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setError(null);
      setIsSuccess(false);
      setSearchQuery("");
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!isValid || !userWallet) return;

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

      setTimeout(() => {
        reset();
        setIsSuccess(false);
        setIsSubmitting(false);
        setSearchQuery("");
        onSuccess();
        onClose();
      }, ANIMATION_DELAYS.SUCCESS_DISPLAY);
    } catch (err) {
      console.error("Error creating expense:", err);
      setError(err instanceof Error ? err.message : "Failed to create expense");
      setIsSubmitting(false);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(
    u =>
      u.twitter_handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToggleFriend = (user: User) => {
    const isSelected = selectedFriends.some(f => f.address.toLowerCase() === user.wallet_address.toLowerCase());
    if (isSelected) {
      removeFriend(user.wallet_address);
    } else {
      const friend: Friend = {
        address: user.wallet_address,
        name: user.twitter_handle || user.name,
        twitterHandle: user.twitter_handle ?? undefined,
        twitterProfileUrl: user.twitter_profile_url ?? undefined,
      };
      addFriend(friend);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-base-100 to-base-200 rounded-2xl shadow-2xl border border-white/10 max-h-[80dvh] flex flex-col mb-4"
          >
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <SuccessState amount={amount} participantCount={participantCount} />
              ) : isSubmitting ? (
                <SubmittingState />
              ) : (
                <motion.div
                  key="form"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col max-h-[80dvh]"
                >
                  <ExpenseModalHeader onClose={handleClose} />
                  <ExpenseAmountInput
                    value={amount}
                    onChange={setAmount}
                    isFocused={amountFocused}
                    onFocusChange={setAmountFocused}
                  />
                  <ExpenseDescriptionInput value={description} onChange={setDescription} />
                  <ExpenseFriendSearch
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    isFocused={searchFocused}
                    onFocusChange={setSearchFocused}
                  />
                  <ExpenseFriendChips selectedFriends={selectedFriends} onRemoveFriend={removeFriend} />
                  <ExpenseFriendList
                    users={filteredUsers}
                    selectedFriends={selectedFriends}
                    loading={loadingUsers}
                    searchQuery={searchQuery}
                    onToggleFriend={handleToggleFriend}
                  />

                  {/* Split Summary */}
                  <AnimatePresence>
                    {participantCount > 1 && amount && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 py-2 border-b border-base-300/50 overflow-hidden"
                      >
                        <SplitSummary totalAmount={amount} participantCount={participantCount} currency="USDC" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 py-2 overflow-hidden"
                      >
                        <div className="flex items-center gap-2 px-3 py-2 bg-error/10 border border-error/20 rounded-xl">
                          <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                          <span className="text-error text-sm">{error}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <ExpenseSubmitFooter
                    isValid={isValid}
                    hasWallet={!!userWallet}
                    onCancel={handleClose}
                    onSubmit={handleSubmit}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Success state component
const SuccessState = ({ amount, participantCount }: { amount: string; participantCount: number }) => (
  <motion.div
    key="success"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="p-8 flex flex-col items-center justify-center"
  >
    <div className="w-20 h-20 bg-emerald-500/15 rounded-3xl flex items-center justify-center mb-5 relative">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
        className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30"
      >
        <Check className="w-7 h-7 text-white" strokeWidth={3} />
      </motion.div>
    </div>
    <h2 className="text-xl font-bold mb-2">Expense Added!</h2>
    <div className="flex items-center gap-2 text-base-content/60">
      <CircleDollarSign className="w-4 h-4 text-emerald-500" />
      <span className="font-semibold">${amount} USDC</span>
      <span>•</span>
      <Users className="w-4 h-4 text-primary" />
      <span>Split {participantCount} ways</span>
    </div>
  </motion.div>
);

// Submitting state component
const SubmittingState = () => (
  <motion.div
    key="submitting"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="p-12 flex flex-col items-center justify-center"
  >
    <div className="relative mb-5">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 rounded-full border-3 border-primary/20 border-t-primary"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles className="w-7 h-7 text-primary/60" />
      </div>
    </div>
    <h3 className="text-lg font-bold mb-1">Creating Expense...</h3>
    <p className="text-base-content/50 text-sm">Just a moment</p>
  </motion.div>
);

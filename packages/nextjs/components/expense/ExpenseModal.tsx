"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SplitSummary } from "./SplitSummary";
import { Friend } from "./hooks/useExpenseForm";
import { useExpenseForm } from "./hooks/useExpenseForm";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, CircleDollarSign, FileText, Search, Sparkles, Users, X } from "lucide-react";
import { TOKENS } from "~~/config/tokens";
import { type User, supabase } from "~~/lib/supabase";
import { createExpense } from "~~/services/expenseService";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Animation variants
const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 50 } },
};

const listItemVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 40 } },
  exit: { opacity: 0, scale: 0.9, y: -5, transition: { duration: 0.15 } },
};

export const ExpenseModal = ({ isOpen, onClose, onSuccess }: ExpenseModalProps) => {
  const { user } = usePrivy();
  // Use Privy's wallet address instead of wagmi's useAccount
  const userWallet = user?.wallet?.address as `0x${string}` | undefined;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Input focus states
  const [amountFocused, setAmountFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);
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

        // Filter out current user
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
      }, 1500);
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

  const isFriendSelected = (address: string) => {
    return selectedFriends.some(f => f.address.toLowerCase() === address.toLowerCase());
  };

  const handleToggleFriend = (user: User) => {
    if (isFriendSelected(user.wallet_address)) {
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
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16">
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
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-base-100 to-base-200 rounded-2xl shadow-2xl border border-white/10 max-h-[85vh] flex flex-col"
          >
            <AnimatePresence mode="wait">
              {isSuccess ? (
                /* Success State */
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
              ) : isSubmitting ? (
                /* Submitting State */
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
              ) : (
                /* Form State */
                <motion.div
                  key="form"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col max-h-[85vh]"
                >
                  {/* Header */}
                  <motion.div
                    variants={staggerItem}
                    className="flex items-center justify-between px-4 py-3 border-b border-base-300/50"
                  >
                    <h2 className="text-lg font-semibold text-base-content">New Expense</h2>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClose}
                      className="w-8 h-8 rounded-full bg-base-300/50 hover:bg-base-300 flex items-center justify-center transition-colors"
                    >
                      <X className="w-5 h-5 text-base-content" />
                    </motion.button>
                  </motion.div>

                  {/* Amount Input */}
                  <motion.div variants={staggerItem} className="px-4 py-2.5 border-b border-base-300/50">
                    <motion.div
                      animate={{
                        boxShadow: amountFocused ? "0 0 0 2px rgba(var(--primary-rgb), 0.5)" : "0 0 0 0px transparent",
                      }}
                      transition={{ duration: 0.2 }}
                      className="flex justify-center py-2.5 bg-base-100/50 rounded-lg"
                    >
                      <div className="relative flex items-baseline">
                        <span className="text-xl font-bold text-primary mr-0.5">$</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          onFocus={() => setAmountFocused(true)}
                          onBlur={() => setAmountFocused(false)}
                          placeholder="0.00"
                          className="bg-transparent text-center text-3xl font-bold outline-none w-32 placeholder:text-base-content/20 caret-primary"
                          autoFocus
                        />
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Description */}
                  <motion.div variants={staggerItem} className="px-4 py-2 border-b border-base-300/50">
                    <label className="text-[10px] text-base-content/50 uppercase tracking-wider mb-1 block flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Description
                    </label>
                    <motion.div
                      animate={{
                        boxShadow: descriptionFocused
                          ? "0 0 0 2px rgba(var(--primary-rgb), 0.5)"
                          : "0 0 0 0px transparent",
                      }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg overflow-hidden"
                    >
                      <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        onFocus={() => setDescriptionFocused(true)}
                        onBlur={() => setDescriptionFocused(false)}
                        placeholder="What's this for?"
                        className="w-full h-9 px-3 bg-base-100 text-sm text-base-content placeholder:text-base-content/40 focus:outline-none transition-all"
                      />
                    </motion.div>
                  </motion.div>

                  {/* Split With Section - Search */}
                  <motion.div variants={staggerItem} className="px-4 py-2 border-b border-base-300/50">
                    <label className="text-[10px] text-base-content/50 uppercase tracking-wider mb-1 block flex items-center gap-1">
                      <Users className="w-3 h-3" /> Split with
                    </label>
                    <motion.div
                      animate={{
                        boxShadow: searchFocused ? "0 0 0 2px rgba(var(--primary-rgb), 0.5)" : "0 0 0 0px transparent",
                      }}
                      transition={{ duration: 0.2 }}
                      className="relative rounded-lg overflow-hidden"
                    >
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        placeholder="Search by @handle or name..."
                        className="w-full h-9 pl-8 pr-3 bg-base-100 text-sm text-base-content placeholder:text-base-content/40 focus:outline-none transition-all"
                      />
                    </motion.div>
                  </motion.div>

                  {/* Selected Friends Chips */}
                  <AnimatePresence>
                    {selectedFriends.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 py-1.5 border-b border-base-300/50 flex flex-wrap gap-1.5 overflow-hidden"
                      >
                        <AnimatePresence mode="popLayout">
                          {selectedFriends.map(friend => (
                            <motion.div
                              key={friend.address}
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              className="flex items-center gap-1 px-2 py-0.5 bg-primary/15 border border-primary/30 rounded-full"
                            >
                              {friend.twitterProfileUrl ? (
                                <Image
                                  src={friend.twitterProfileUrl}
                                  alt={friend.name}
                                  width={16}
                                  height={16}
                                  className="w-4 h-4 rounded-full"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-primary/30 flex items-center justify-center">
                                  <span className="text-[7px] font-bold text-primary">
                                    {friend.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="text-[11px] font-medium text-base-content">{friend.name}</span>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeFriend(friend.address)}
                                className="w-3.5 h-3.5 rounded-full bg-base-content/10 hover:bg-base-content/20 flex items-center justify-center"
                              >
                                <X className="w-2 h-2 text-base-content/60" />
                              </motion.button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Friend List */}
                  <motion.div
                    variants={staggerItem}
                    className="flex-1 overflow-y-auto px-4 py-1.5 min-h-[120px] max-h-[160px]"
                  >
                    {loadingUsers ? (
                      <div className="flex items-center justify-center py-6">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full"
                        />
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {filteredUsers.length > 0 ? (
                          <motion.div layout className="space-y-0.5">
                            {filteredUsers.map((user, index) => {
                              const isSelected = isFriendSelected(user.wallet_address);
                              return (
                                <motion.button
                                  key={user.wallet_address}
                                  layout
                                  variants={listItemVariants}
                                  initial="hidden"
                                  animate="show"
                                  exit="exit"
                                  custom={index}
                                  whileTap={{ scale: 1.01 }}
                                  onClick={() => handleToggleFriend(user)}
                                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors ${
                                    isSelected
                                      ? "bg-primary/15 border border-primary/40"
                                      : "bg-base-100/50 hover:bg-base-100 active:bg-base-300/50"
                                  }`}
                                >
                                  {/* Avatar */}
                                  {user.twitter_profile_url ? (
                                    <Image
                                      src={user.twitter_profile_url}
                                      alt={user.twitter_handle || user.name}
                                      width={32}
                                      height={32}
                                      className="w-8 h-8 rounded-full flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-bold text-primary">
                                        {(user.twitter_handle || user.name).charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}

                                  {/* User info */}
                                  <div className="flex-1 text-left min-w-0">
                                    <div className="font-medium text-[13px] text-base-content truncate">
                                      {user.name}
                                    </div>
                                    <div className="text-[11px] text-base-content/60 truncate">
                                      {user.twitter_handle
                                        ? `@${user.twitter_handle}`
                                        : user.wallet_address.slice(0, 10)}
                                    </div>
                                  </div>

                                  {/* Checkbox */}
                                  <motion.div
                                    animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                                    transition={{ duration: 0.2 }}
                                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                                      isSelected ? "bg-primary" : "bg-base-200 border-2 border-base-content/20"
                                    }`}
                                  >
                                    <AnimatePresence>
                                      {isSelected && (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          exit={{ scale: 0 }}
                                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                        >
                                          <Check className="w-2.5 h-2.5 text-primary-content" />
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </motion.div>
                                </motion.button>
                              );
                            })}
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-6"
                          >
                            <div className="w-10 h-10 rounded-full bg-base-100 flex items-center justify-center mb-1.5">
                              <Search className="w-5 h-5 text-base-content/30" />
                            </div>
                            <p className="text-xs text-base-content/50">
                              {searchQuery ? "No users found" : "No users available"}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </motion.div>

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

                  {/* Footer */}
                  <motion.div variants={staggerItem} className="px-4 py-2.5 flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClose}
                      className="flex-1 h-10 bg-base-300/50 hover:bg-base-300 text-base-content font-medium text-sm rounded-lg transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={isValid && userWallet ? { scale: 1.02 } : {}}
                      whileTap={isValid && userWallet ? { scale: 0.98 } : {}}
                      onClick={handleSubmit}
                      disabled={!isValid || !userWallet}
                      className="flex-1 h-10 bg-primary hover:bg-primary/90 disabled:bg-base-300 disabled:text-base-content/40 text-primary-content font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <CircleDollarSign className="w-4 h-4" />
                      Create Expense
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

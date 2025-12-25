"use client";

import { Friend } from "./hooks/useExpenseForm";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Search } from "lucide-react";
import { UserAvatar } from "~~/components/shared/UserAvatar";
import { listItemVariants, staggerItem } from "~~/components/shared/animations/common.animations";
import { type User } from "~~/lib/supabase";

interface ExpenseFriendListProps {
  /** List of users to display */
  users: User[];
  /** List of currently selected friends */
  selectedFriends: Friend[];
  /** Whether users are loading */
  loading: boolean;
  /** Current search query (for empty state message) */
  searchQuery: string;
  /** Callback when a user is toggled */
  onToggleFriend: (user: User) => void;
}

/**
 * Scrollable list of users with selection checkboxes.
 */
export const ExpenseFriendList = ({
  users,
  selectedFriends,
  loading,
  searchQuery,
  onToggleFriend,
}: ExpenseFriendListProps) => {
  const isFriendSelected = (address: string) => {
    return selectedFriends.some(f => f.address.toLowerCase() === address.toLowerCase());
  };

  return (
    <motion.div variants={staggerItem} className="flex-1 overflow-y-auto px-4 py-1.5 min-h-[120px] max-h-[160px]">
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full"
          />
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {users.length > 0 ? (
            <motion.div layout className="space-y-0.5">
              {users.map((user, index) => {
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
                    onClick={() => onToggleFriend(user)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-primary/15 border border-primary/40"
                        : "bg-base-100/50 hover:bg-base-100 active:bg-base-300/50"
                    }`}
                  >
                    {/* Avatar */}
                    <UserAvatar
                      user={{
                        twitter_profile_url: user.twitter_profile_url,
                        name: user.twitter_handle || user.name,
                      }}
                      size={32}
                    />

                    {/* User info */}
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-[13px] text-base-content truncate">{user.name}</div>
                      <div className="text-[11px] text-base-content/60 truncate">
                        {user.twitter_handle ? `@${user.twitter_handle}` : user.wallet_address.slice(0, 10)}
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
              <p className="text-xs text-base-content/50">{searchQuery ? "No users found" : "No users available"}</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

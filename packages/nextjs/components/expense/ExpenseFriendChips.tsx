"use client";

import { Friend } from "./hooks/useExpenseForm";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { UserAvatarSmall } from "~~/components/shared/UserAvatar";

interface ExpenseFriendChipsProps {
  /** List of selected friends */
  selectedFriends: Friend[];
  /** Callback to remove a friend */
  onRemoveFriend: (address: string) => void;
}

/**
 * Selected friends displayed as removable chips.
 */
export const ExpenseFriendChips = ({ selectedFriends, onRemoveFriend }: ExpenseFriendChipsProps) => {
  if (selectedFriends.length === 0) return null;

  return (
    <AnimatePresence>
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
              <UserAvatarSmall
                user={{
                  twitter_profile_url: friend.twitterProfileUrl,
                  name: friend.name,
                }}
                size={16}
              />
              <span className="text-[11px] font-medium text-base-content">{friend.name}</span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onRemoveFriend(friend.address)}
                className="w-3.5 h-3.5 rounded-full bg-base-content/10 hover:bg-base-content/20 flex items-center justify-center"
              >
                <X className="w-2 h-2 text-base-content/60" />
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

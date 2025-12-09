"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Search, X } from "lucide-react";
import { type CircleWithMembers, type User, supabase } from "~~/lib/supabase";
import { createCircle, updateCircle } from "~~/services/circleService";

interface CircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCircle: CircleWithMembers | null;
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

export const CircleModal = ({ isOpen, onClose, onSuccess, editingCircle }: CircleModalProps) => {
  const { user } = usePrivy();
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameInputFocused, setNameInputFocused] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);

  const walletAddress = user?.wallet?.address;

  // Initialize form when editing
  useEffect(() => {
    if (editingCircle) {
      setName(editingCircle.name);
      setSelectedMembers(editingCircle.members);
    } else {
      setName("");
      setSelectedMembers([]);
    }
    setSearchQuery("");
    setError(null);
  }, [editingCircle, isOpen]);

  // Fetch users from Supabase
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .not("chip_address", "is", null) // Only show users with registered chips
          .order("twitter_handle");

        if (error) throw error;

        // Filter out current user
        const filtered = (data || []).filter(u => u.wallet_address.toLowerCase() !== walletAddress?.toLowerCase());
        setUsers(filtered);
      } catch (err) {
        console.error("Error fetching users:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, walletAddress]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Filter users by search
  const filteredUsers = users.filter(
    u =>
      u.twitter_handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isMemberSelected = (wallet: string) => {
    return selectedMembers.some(m => m.wallet_address.toLowerCase() === wallet.toLowerCase());
  };

  const handleToggleMember = (user: User) => {
    if (isMemberSelected(user.wallet_address)) {
      setSelectedMembers(prev =>
        prev.filter(m => m.wallet_address.toLowerCase() !== user.wallet_address.toLowerCase()),
      );
    } else {
      setSelectedMembers(prev => [...prev, user]);
    }
  };

  const handleSave = async () => {
    if (!walletAddress || !name.trim() || selectedMembers.length === 0) {
      setError("Please enter a name and select at least one member");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const memberWallets = selectedMembers.map(m => m.wallet_address);

      if (editingCircle) {
        await updateCircle(editingCircle.id, {
          name: name.trim(),
          memberWallets,
        });
      } else {
        await createCircle(walletAddress, name.trim(), memberWallets);
      }

      onSuccess();
    } catch (err) {
      console.error("Error saving circle:", err);
      setError(err instanceof Error ? err.message : "Failed to save circle");
    } finally {
      setSaving(false);
    }
  };

  const isValid = name.trim().length > 0 && selectedMembers.length > 0;

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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm bg-base-200 rounded-2xl shadow-xl max-h-[85vh] flex flex-col"
          >
            {/* Staggered Content Container */}
            <motion.div
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
                <h2 className="text-lg font-semibold text-base-content">
                  {editingCircle ? "Edit Circle" : "Create Circle"}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-base-300/50 hover:bg-base-300 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-base-content" />
                </motion.button>
              </motion.div>

              {/* Name Input */}
              <motion.div variants={staggerItem} className="px-4 py-3 border-b border-base-300/50">
                <label className="text-xs text-base-content/50 uppercase tracking-wider mb-1.5 block">
                  Circle Name
                </label>
                <motion.div
                  animate={{
                    boxShadow: nameInputFocused ? "0 0 0 2px rgba(var(--primary-rgb), 0.5)" : "0 0 0 0px transparent",
                  }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl overflow-hidden"
                >
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onFocus={() => setNameInputFocused(true)}
                    onBlur={() => setNameInputFocused(false)}
                    placeholder="e.g., Roommates, Work Lunch"
                    className="w-full h-11 px-4 bg-base-100 text-sm text-base-content placeholder:text-base-content/40 focus:outline-none transition-all"
                  />
                </motion.div>
              </motion.div>

              {/* Search */}
              <motion.div variants={staggerItem} className="px-4 py-3 border-b border-base-300/50">
                <label className="text-xs text-base-content/50 uppercase tracking-wider mb-1.5 block">
                  Select Members
                </label>
                <motion.div
                  animate={{
                    boxShadow: searchInputFocused ? "0 0 0 2px rgba(var(--primary-rgb), 0.5)" : "0 0 0 0px transparent",
                  }}
                  transition={{ duration: 0.2 }}
                  className="relative rounded-xl overflow-hidden"
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchInputFocused(true)}
                    onBlur={() => setSearchInputFocused(false)}
                    placeholder="Search by @handle or name..."
                    className="w-full h-11 pl-9 pr-3 bg-base-100 text-sm text-base-content placeholder:text-base-content/40 focus:outline-none transition-all"
                  />
                </motion.div>
              </motion.div>

              {/* Selected Members Chips */}
              <AnimatePresence>
                {selectedMembers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 py-2 border-b border-base-300/50 flex flex-wrap gap-2 overflow-hidden"
                  >
                    <AnimatePresence mode="popLayout">
                      {selectedMembers.map(member => (
                        <motion.div
                          key={member.wallet_address}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 border border-primary/30 rounded-full"
                        >
                          {member.twitter_profile_url ? (
                            <Image
                              src={member.twitter_profile_url}
                              alt={member.name}
                              width={18}
                              height={18}
                              className="w-4.5 h-4.5 rounded-full"
                            />
                          ) : (
                            <div className="w-4.5 h-4.5 rounded-full bg-primary/30 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-primary">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-xs font-medium text-base-content">{member.name}</span>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleToggleMember(member)}
                            className="w-4 h-4 rounded-full bg-base-content/10 hover:bg-base-content/20 flex items-center justify-center"
                          >
                            <X className="w-2.5 h-2.5 text-base-content/60" />
                          </motion.button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* User list */}
              <motion.div variants={staggerItem} className="flex-1 overflow-y-auto px-4 py-2 min-h-[200px]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
                    />
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredUsers.length > 0 ? (
                      <motion.div layout className="space-y-1">
                        {filteredUsers.map((user, index) => {
                          const isSelected = isMemberSelected(user.wallet_address);
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
                              onClick={() => handleToggleMember(user)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
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
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-full flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-sm font-bold text-primary">
                                    {(user.twitter_handle || user.name).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}

                              {/* User info */}
                              <div className="flex-1 text-left min-w-0">
                                <div className="font-medium text-sm text-base-content truncate">{user.name}</div>
                                <div className="text-xs text-base-content/60 truncate">
                                  {user.twitter_handle ? `@${user.twitter_handle}` : user.wallet_address.slice(0, 10)}
                                </div>
                              </div>

                              {/* Checkbox */}
                              <motion.div
                                animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                                transition={{ duration: 0.2 }}
                                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
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
                                      <Check className="w-3 h-3 text-primary-content" />
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
                        className="flex flex-col items-center justify-center py-12"
                      >
                        <div className="w-12 h-12 rounded-full bg-base-100 flex items-center justify-center mb-2">
                          <Search className="w-6 h-6 text-base-content/30" />
                        </div>
                        <p className="text-sm text-base-content/50">
                          {searchQuery ? "No users found" : "No users available"}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 py-2 overflow-hidden"
                  >
                    <p className="text-sm text-error">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <motion.div variants={staggerItem} className="px-4 py-3 border-t border-base-300/50 flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 h-11 bg-base-300/50 hover:bg-base-300 text-base-content font-medium text-sm rounded-xl transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={isValid && !saving ? { scale: 1.02 } : {}}
                  whileTap={isValid && !saving ? { scale: 0.98 } : {}}
                  onClick={handleSave}
                  disabled={!isValid || saving}
                  className="flex-1 h-11 bg-primary hover:bg-primary/90 disabled:bg-base-300 disabled:text-base-content/40 text-primary-content font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    {saving ? (
                      <motion.div
                        key="saving"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-primary-content/30 border-t-primary-content rounded-full"
                        />
                        <span>Saving...</span>
                      </motion.div>
                    ) : (
                      <motion.span
                        key="save"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        {editingCircle ? "Save Changes" : "Create Circle"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Link as LinkIcon, Percent, Search, Sparkles, Store, User, X } from "lucide-react";
import { TOKENS } from "~~/config/tokens";
import type { CreateStallData, Stall } from "~~/lib/events.types";
import { type User as UserType, supabase } from "~~/lib/supabase";

interface StallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eventId: number;
  eventSlug: string;
  editingStall?: Stall | null;
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

// Generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
};

export const StallModal = ({ isOpen, onClose, onSuccess, eventId, eventSlug, editingStall }: StallModalProps) => {
  const [stallName, setStallName] = useState("");
  const [stallSlug, setStallSlug] = useState("");
  const [description, setDescription] = useState("");
  const [splitPercentage, setSplitPercentage] = useState(70);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<UserType | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [slugFocused, setSlugFocused] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Auto-generate slug from name
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (editingStall) {
      setStallName(editingStall.stall_name);
      setStallSlug(editingStall.stall_slug);
      setDescription(editingStall.stall_description || "");
      setSplitPercentage(editingStall.split_percentage);
      setSlugManuallyEdited(true);
      // Find operator user if they exist
      if (editingStall.operator_user) {
        setSelectedOperator({
          wallet_address: editingStall.operator_wallet || "",
          name: editingStall.operator_user.name,
          twitter_handle: editingStall.operator_user.twitter_handle || null,
          twitter_profile_url: editingStall.operator_user.twitter_profile_url || null,
        } as UserType);
      }
    } else {
      setStallName("");
      setStallSlug("");
      setDescription("");
      setSplitPercentage(70);
      setSelectedOperator(null);
      setSlugManuallyEdited(false);
    }
    setSearchQuery("");
    setError(null);
    setIsSuccess(false);
  }, [editingStall, isOpen]);

  // Auto-generate slug when name changes (if not manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && stallName) {
      setStallSlug(generateSlug(stallName));
    }
  }, [stallName, slugManuallyEdited]);

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
        setUsers(data || []);
      } catch (err) {
        console.error("Error fetching users:", err);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isOpen]);

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

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setStallSlug(generateSlug(value));
  };

  // Filter users by search
  const filteredUsers = users.filter(
    u =>
      u.twitter_handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectOperator = (user: UserType) => {
    setSelectedOperator(user);
    setSearchQuery("");
  };

  const handleSubmit = async () => {
    if (!stallName.trim() || !stallSlug.trim() || !selectedOperator) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const stallData: CreateStallData = {
        event_id: eventId,
        stall_name: stallName.trim(),
        stall_slug: stallSlug.trim(),
        stall_description: description.trim() || undefined,
        operator_twitter_handle: selectedOperator.twitter_handle || selectedOperator.name,
        split_percentage: splitPercentage,
        token_address: TOKENS.USDC,
      };

      const endpoint = editingStall ? `/api/events/stalls/${editingStall.id}` : "/api/events/stalls/create";
      const method = editingStall ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stallData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save stall");
      }

      setIsSuccess(true);

      setTimeout(() => {
        setIsSuccess(false);
        setIsSubmitting(false);
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Error saving stall:", err);
      setError(err instanceof Error ? err.message : "Failed to save stall");
      setIsSubmitting(false);
    }
  };

  const isValid = stallName.trim().length > 0 && stallSlug.trim().length > 0 && selectedOperator !== null;
  const ownerPercentage = 100 - splitPercentage;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-12 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !isSubmitting && onClose()}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-base-100 to-base-200 rounded-2xl shadow-2xl border border-white/10 mb-8 flex flex-col overflow-hidden"
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
                  <h2 className="text-xl font-bold mb-2">{editingStall ? "Stall Updated!" : "Stall Created!"}</h2>
                  <p className="text-base-content/60 text-sm">{stallName}</p>
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
                  <h3 className="text-lg font-bold mb-1">{editingStall ? "Updating Stall..." : "Creating Stall..."}</h3>
                  <p className="text-base-content/50 text-sm">Just a moment</p>
                </motion.div>
              ) : (
                /* Form State */
                <motion.div
                  key="form"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col"
                >
                  {/* Header */}
                  <motion.div
                    variants={staggerItem}
                    className="flex items-center justify-between px-4 py-3 border-b border-base-300/50"
                  >
                    <div className="flex items-center gap-2">
                      <Store className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-semibold text-base-content">
                        {editingStall ? "Edit Stall" : "New Stall"}
                      </h2>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="w-8 h-8 rounded-full bg-base-300/50 hover:bg-base-300 flex items-center justify-center transition-colors"
                    >
                      <X className="w-5 h-5 text-base-content" />
                    </motion.button>
                  </motion.div>

                  {/* Stall Name Input */}
                  <motion.div variants={staggerItem} className="px-4 py-3 border-b border-base-300/50">
                    <label className="text-xs text-base-content/50 uppercase tracking-wider mb-1.5 block">
                      Stall Name *
                    </label>
                    <motion.div
                      animate={{
                        boxShadow: nameFocused ? "0 0 0 2px rgba(242, 169, 0, 0.5)" : "0 0 0 0px transparent",
                      }}
                      transition={{ duration: 0.2 }}
                      className="rounded-xl overflow-hidden"
                    >
                      <input
                        type="text"
                        value={stallName}
                        onChange={e => setStallName(e.target.value)}
                        onFocus={() => setNameFocused(true)}
                        onBlur={() => setNameFocused(false)}
                        placeholder="e.g., Coffee Stand"
                        className="w-full h-11 px-4 bg-base-100 text-sm text-base-content placeholder:text-base-content/40 focus:outline-none transition-all"
                      />
                    </motion.div>
                  </motion.div>

                  {/* Slug Input with URL preview */}
                  <motion.div variants={staggerItem} className="px-4 py-3 border-b border-base-300/50">
                    <label className="text-xs text-base-content/50 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                      <LinkIcon className="w-3 h-3" />
                      Public URL
                    </label>
                    <motion.div
                      animate={{
                        boxShadow: slugFocused ? "0 0 0 2px rgba(242, 169, 0, 0.5)" : "0 0 0 0px transparent",
                      }}
                      transition={{ duration: 0.2 }}
                      className="rounded-xl overflow-hidden"
                    >
                      <div className="flex items-center bg-base-100">
                        <span className="pl-3 text-xs text-base-content/40 whitespace-nowrap">
                          /events/{eventSlug}/
                        </span>
                        <input
                          type="text"
                          value={stallSlug}
                          onChange={e => handleSlugChange(e.target.value)}
                          onFocus={() => setSlugFocused(true)}
                          onBlur={() => setSlugFocused(false)}
                          placeholder="coffee-stand"
                          className="flex-1 h-11 px-1 bg-transparent text-sm text-base-content placeholder:text-base-content/40 focus:outline-none transition-all"
                        />
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Operator Selection */}
                  <motion.div variants={staggerItem} className="px-4 py-2 border-b border-base-300/50">
                    <label className="text-[10px] text-base-content/50 uppercase tracking-wider mb-1 block flex items-center gap-1">
                      <User className="w-3 h-3" /> Stall Operator *
                    </label>

                    {/* Selected Operator */}
                    {selectedOperator && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 p-2 mb-2 bg-primary/15 border border-primary/30 rounded-xl"
                      >
                        {selectedOperator.twitter_profile_url ? (
                          <Image
                            src={selectedOperator.twitter_profile_url}
                            alt={selectedOperator.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                              {selectedOperator.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <span className="text-sm font-medium text-base-content">{selectedOperator.name}</span>
                          {selectedOperator.twitter_handle && (
                            <span className="text-xs text-base-content/50 ml-1">
                              @{selectedOperator.twitter_handle}
                            </span>
                          )}
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setSelectedOperator(null)}
                          className="w-6 h-6 rounded-full bg-base-content/10 hover:bg-base-content/20 flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-base-content/60" />
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Search Input */}
                    {!selectedOperator && (
                      <>
                        <motion.div
                          animate={{
                            boxShadow: searchFocused ? "0 0 0 2px rgba(242, 169, 0, 0.5)" : "0 0 0 0px transparent",
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

                        {/* User List */}
                        <div className="mt-2 max-h-[120px] overflow-y-auto">
                          {loadingUsers ? (
                            <div className="flex items-center justify-center py-4">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full"
                              />
                            </div>
                          ) : (
                            <AnimatePresence mode="popLayout">
                              {filteredUsers.length > 0 ? (
                                <motion.div layout className="space-y-0.5">
                                  {filteredUsers.slice(0, 5).map((user, index) => (
                                    <motion.button
                                      key={user.wallet_address}
                                      layout
                                      variants={listItemVariants}
                                      initial="hidden"
                                      animate="show"
                                      exit="exit"
                                      custom={index}
                                      whileTap={{ scale: 1.01 }}
                                      onClick={() => handleSelectOperator(user)}
                                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-base-100/50 hover:bg-base-100 active:bg-base-300/50 transition-colors"
                                    >
                                      {user.twitter_profile_url ? (
                                        <Image
                                          src={user.twitter_profile_url}
                                          alt={user.twitter_handle || user.name}
                                          width={28}
                                          height={28}
                                          className="w-7 h-7 rounded-full flex-shrink-0"
                                        />
                                      ) : (
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                                          <span className="text-[10px] font-bold text-primary">
                                            {(user.twitter_handle || user.name).charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex-1 text-left min-w-0">
                                        <div className="font-medium text-[12px] text-base-content truncate">
                                          {user.name}
                                        </div>
                                        <div className="text-[10px] text-base-content/60 truncate">
                                          {user.twitter_handle
                                            ? `@${user.twitter_handle}`
                                            : user.wallet_address.slice(0, 10)}
                                        </div>
                                      </div>
                                    </motion.button>
                                  ))}
                                </motion.div>
                              ) : (
                                <div className="text-center py-3">
                                  <p className="text-xs text-base-content/50">
                                    {searchQuery ? "No users found" : "Search for operator"}
                                  </p>
                                </div>
                              )}
                            </AnimatePresence>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>

                  {/* Split Percentage */}
                  <motion.div variants={staggerItem} className="px-4 py-3 border-b border-base-300/50">
                    <label className="text-xs text-base-content/50 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                      <Percent className="w-3 h-3" />
                      Revenue Split
                    </label>

                    {/* Visual Split Bar */}
                    <div className="mb-3">
                      <div className="flex rounded-xl overflow-hidden h-8">
                        <motion.div
                          className="bg-emerald-500/80 flex items-center justify-center"
                          style={{ width: `${splitPercentage}%` }}
                          layout
                        >
                          <span className="text-[10px] font-bold text-white">Operator {splitPercentage}%</span>
                        </motion.div>
                        <motion.div
                          className="bg-primary/80 flex items-center justify-center"
                          style={{ width: `${ownerPercentage}%` }}
                          layout
                        >
                          <span className="text-[10px] font-bold text-primary-content">You {ownerPercentage}%</span>
                        </motion.div>
                      </div>
                    </div>

                    {/* Slider */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-base-content/50">0%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={splitPercentage}
                        onChange={e => setSplitPercentage(parseInt(e.target.value))}
                        className="flex-1 range range-primary range-xs"
                      />
                      <span className="text-xs text-base-content/50">100%</span>
                    </div>

                    {/* Quick presets */}
                    <div className="flex gap-2 mt-2">
                      {[50, 70, 80, 100].map(preset => (
                        <button
                          key={preset}
                          onClick={() => setSplitPercentage(preset)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            splitPercentage === preset
                              ? "bg-primary text-primary-content"
                              : "bg-base-300/50 text-base-content/70 hover:bg-base-300"
                          }`}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
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
                        <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-xl">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Footer */}
                  <motion.div variants={staggerItem} className="px-4 py-3 flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onClose}
                      className="flex-1 h-11 bg-base-300/50 hover:bg-base-300 text-base-content font-medium text-sm rounded-xl transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={isValid ? { scale: 1.02 } : {}}
                      whileTap={isValid ? { scale: 0.98 } : {}}
                      onClick={handleSubmit}
                      disabled={!isValid}
                      className="flex-1 h-11 bg-primary hover:bg-primary/90 disabled:bg-base-300 disabled:text-base-content/40 text-primary-content font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Store className="w-4 h-4" />
                      {editingStall ? "Save Changes" : "Create Stall"}
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

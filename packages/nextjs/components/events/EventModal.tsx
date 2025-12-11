"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Check, Link as LinkIcon, Sparkles, X } from "lucide-react";
import type { CreateEventData, Event } from "~~/lib/events.types";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingEvent?: Event | null;
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

// Generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
};

export const EventModal = ({ isOpen, onClose, onSuccess, editingEvent }: EventModalProps) => {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;

  const [eventName, setEventName] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [slugFocused, setSlugFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);

  // Auto-generate slug from name
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (editingEvent) {
      setEventName(editingEvent.event_name);
      setEventSlug(editingEvent.event_slug);
      setDescription(editingEvent.event_description || "");
      setStartDate(editingEvent.start_date ? editingEvent.start_date.slice(0, 16) : "");
      setEndDate(editingEvent.end_date ? editingEvent.end_date.slice(0, 16) : "");
      setSlugManuallyEdited(true);
    } else {
      setEventName("");
      setEventSlug("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setSlugManuallyEdited(false);
    }
    setError(null);
    setIsSuccess(false);
  }, [editingEvent, isOpen]);

  // Auto-generate slug when name changes (if not manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && eventName) {
      setEventSlug(generateSlug(eventName));
    }
  }, [eventName, slugManuallyEdited]);

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
    setEventSlug(generateSlug(value));
  };

  const handleSubmit = async () => {
    if (!walletAddress || !eventName.trim() || !eventSlug.trim()) {
      setError("Please enter an event name");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const eventData: CreateEventData = {
        event_name: eventName.trim(),
        event_slug: eventSlug.trim(),
        owner_wallet: walletAddress.toLowerCase(),
        event_description: description.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      const endpoint = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events/create";
      const method = editingEvent ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save event");
      }

      setIsSuccess(true);

      setTimeout(() => {
        setIsSuccess(false);
        setIsSubmitting(false);
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Error saving event:", err);
      setError(err instanceof Error ? err.message : "Failed to save event");
      setIsSubmitting(false);
    }
  };

  const isValid = eventName.trim().length > 0 && eventSlug.trim().length > 0;

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
            onClick={() => !isSubmitting && onClose()}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-base-100 to-base-200 rounded-2xl shadow-2xl border border-white/10 max-h-[85vh] flex flex-col overflow-hidden"
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
                  <h2 className="text-xl font-bold mb-2">{editingEvent ? "Event Updated!" : "Event Created!"}</h2>
                  <p className="text-base-content/60 text-sm">{eventName}</p>
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
                  <h3 className="text-lg font-bold mb-1">{editingEvent ? "Updating Event..." : "Creating Event..."}</h3>
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
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-semibold text-base-content">
                        {editingEvent ? "Edit Event" : "New Event"}
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

                  {/* Event Name Input */}
                  <motion.div variants={staggerItem} className="px-4 py-3 border-b border-base-300/50">
                    <label className="text-xs text-base-content/50 uppercase tracking-wider mb-1.5 block">
                      Event Name *
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
                        value={eventName}
                        onChange={e => setEventName(e.target.value)}
                        onFocus={() => setNameFocused(true)}
                        onBlur={() => setNameFocused(false)}
                        placeholder="e.g., Summer Festival 2024"
                        className="w-full h-11 px-4 bg-base-100 text-sm text-base-content placeholder:text-base-content/40 focus:outline-none transition-all"
                      />
                    </motion.div>
                  </motion.div>

                  {/* Slug Input */}
                  <motion.div variants={staggerItem} className="px-4 py-3 border-b border-base-300/50">
                    <label className="text-xs text-base-content/50 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                      <LinkIcon className="w-3 h-3" />
                      URL Slug
                    </label>
                    <motion.div
                      animate={{
                        boxShadow: slugFocused ? "0 0 0 2px rgba(242, 169, 0, 0.5)" : "0 0 0 0px transparent",
                      }}
                      transition={{ duration: 0.2 }}
                      className="rounded-xl overflow-hidden"
                    >
                      <div className="flex items-center bg-base-100">
                        <span className="pl-4 text-sm text-base-content/40">/events/</span>
                        <input
                          type="text"
                          value={eventSlug}
                          onChange={e => handleSlugChange(e.target.value)}
                          onFocus={() => setSlugFocused(true)}
                          onBlur={() => setSlugFocused(false)}
                          placeholder="summer-festival"
                          className="flex-1 h-11 px-1 bg-transparent text-sm text-base-content placeholder:text-base-content/40 focus:outline-none transition-all"
                        />
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Description Input */}
                  <motion.div variants={staggerItem} className="px-4 py-3 border-b border-base-300/50">
                    <label className="text-xs text-base-content/50 uppercase tracking-wider mb-1.5 block">
                      Description (optional)
                    </label>
                    <motion.div
                      animate={{
                        boxShadow: descFocused ? "0 0 0 2px rgba(242, 169, 0, 0.5)" : "0 0 0 0px transparent",
                      }}
                      transition={{ duration: 0.2 }}
                      className="rounded-xl overflow-hidden"
                    >
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        onFocus={() => setDescFocused(true)}
                        onBlur={() => setDescFocused(false)}
                        placeholder="What's this event about?"
                        rows={2}
                        className="w-full px-4 py-3 bg-base-100 text-sm text-base-content placeholder:text-base-content/40 focus:outline-none transition-all resize-none"
                      />
                    </motion.div>
                  </motion.div>

                  {/* Date Inputs */}
                  <motion.div variants={staggerItem} className="px-4 py-3 border-b border-base-300/50">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-base-content/50 uppercase tracking-wider mb-1.5 block">
                          Start Date
                        </label>
                        <input
                          type="datetime-local"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          className="w-full h-10 px-3 bg-base-100 text-sm text-base-content rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-base-content/50 uppercase tracking-wider mb-1.5 block">
                          End Date
                        </label>
                        <input
                          type="datetime-local"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          className="w-full h-10 px-3 bg-base-100 text-sm text-base-content rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
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
                      <Calendar className="w-4 h-4" />
                      {editingEvent ? "Save Changes" : "Create Event"}
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

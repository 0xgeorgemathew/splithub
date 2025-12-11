"use client";

import { useState } from "react";
import { EventModal } from "./EventModal";
import { StallSection } from "./StallSection";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronRight, DollarSign, Plus, Sparkles, Store } from "lucide-react";
import { type EventWithStats, useEventsRealtime } from "~~/hooks/useEventsRealtime";

export const EventsList = () => {
  const { events, loading, error, refresh } = useEventsRealtime();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithStats | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);

  const formatAmount = (amount: number): string => {
    return amount.toFixed(2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "paused":
        return "bg-warning/20 text-warning border-warning/30";
      case "ended":
        return "bg-base-content/10 text-base-content/50 border-base-content/20";
      default:
        return "bg-base-content/10 text-base-content/50 border-base-content/20";
    }
  };

  // Calculate totals
  const totalRevenue = events.reduce((sum, e) => sum + e.totalRevenue, 0);
  const totalStalls = events.reduce((sum, e) => sum + e.stallCount, 0);
  const activeEvents = events.filter(e => e.status === "active").length;

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: EventWithStats) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
    refresh();
  };

  const toggleExpand = (eventId: number) => {
    setExpandedEventId(prev => (prev === eventId ? null : eventId));
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary/50" />
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base-content/50 text-sm mt-4 font-medium"
        >
          Loading your events...
        </motion.p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center mb-4"
        >
          <svg className="w-7 h-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </motion.div>
        <p className="text-error text-sm font-medium mb-4">{error}</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => refresh()}
          className="px-5 py-2.5 bg-primary text-primary-content rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          Try Again
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Hero Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 rounded-3xl p-6 relative overflow-hidden border border-white/[0.05]"
        style={{
          background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
          boxShadow: "0 4px 20px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        {/* Subtle mesh gradient overlay */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(at 20% 30%, rgba(242, 169, 0, 0.12) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)",
          }}
        />

        <div className="relative">
          {/* Label */}
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-warning" />
            <span className="text-xs font-bold text-warning uppercase tracking-wider">Event Revenue</span>
          </div>

          {/* Main Amount */}
          <div className="mb-4">
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-bold text-white tracking-tight font-mono"
            >
              ${formatAmount(totalRevenue)}
            </motion.span>
          </div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4"
          >
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-base-content/70">
                {events.length} {events.length === 1 ? "event" : "events"}
              </span>
              {activeEvents > 0 && <span className="text-xs text-emerald-400 ml-1">({activeEvents} active)</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <Store className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-base-content/70">
                {totalStalls} {totalStalls === 1 ? "stall" : "stalls"}
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">My Events</span>
          <span className="text-xs text-base-content/50 bg-base-300/50 px-2 py-0.5 rounded-full">{events.length}</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreateEvent}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Event
        </motion.button>
      </div>

      {/* Events List or Empty State */}
      <AnimatePresence mode="wait">
        {events.length === 0 ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center py-16 px-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-5"
            >
              <CalendarDays className="w-10 h-10 text-primary/40" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-base-content/70 font-semibold text-lg"
            >
              No events yet
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-base-content/50 text-sm mt-1 mb-5"
            >
              Create your first event to start collecting payments
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateEvent}
              className="px-5 py-2.5 bg-primary text-primary-content rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Create Your First Event
            </motion.button>
          </motion.div>
        ) : (
          <motion.div key="events-list" className="space-y-3">
            {events.map((event, index) => {
              const isExpanded = expandedEventId === event.id;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-2xl overflow-hidden transition-all ${
                    event.status === "active"
                      ? "bg-gradient-to-br from-base-200/80 to-base-200/40 border border-primary/20"
                      : "bg-base-200/50 border border-transparent"
                  }`}
                >
                  {/* Event Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-base-300/20 transition-colors"
                    onClick={() => toggleExpand(event.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Status indicator */}
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          event.status === "active"
                            ? "bg-emerald-500 animate-pulse"
                            : event.status === "paused"
                              ? "bg-warning"
                              : "bg-base-content/20"
                        }`}
                      />

                      {/* Event info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base-content truncate">{event.event_name}</span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(event.status)}`}
                          >
                            {event.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-base-content/50">
                          <span className="flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            {event.stallCount} {event.stallCount === 1 ? "stall" : "stalls"}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />${formatAmount(event.totalRevenue)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-5 h-5 text-base-content/40 transition-transform flex-shrink-0 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </div>

                  {/* Expanded Content - Stalls */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-base-300/50 overflow-hidden"
                      >
                        <StallSection event={event} onEditEvent={() => handleEditEvent(event)} onRefresh={refresh} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        onSuccess={handleModalSuccess}
        editingEvent={editingEvent}
      />
    </div>
  );
};

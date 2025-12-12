"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { CalendarDays, Sparkles } from "lucide-react";
import { DashboardControls } from "~~/components/events/DashboardControls";
import { DashboardHero } from "~~/components/events/DashboardHero";
import { EventModal } from "~~/components/events/EventModal";
import { LiveFeed } from "~~/components/events/LiveFeed";
import { StallModal } from "~~/components/events/StallModal";
import { useDashboardRealtime } from "~~/hooks/useDashboardRealtime";

export default function EventsPage() {
  const { ready, authenticated, user: privyUser, login } = usePrivy();
  const {
    mode,
    metrics,
    feed,
    events,
    eventsWithRevenue,
    operatorStalls,
    loading,
    error,
    refresh,
    activeContext,
    hasDualRole,
  } = useDashboardRealtime();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isStallModalOpen, setIsStallModalOpen] = useState(false);
  const [quickAddStallEventId, setQuickAddStallEventId] = useState<number | null>(null);

  // Loading state - Privy not ready
  if (!ready) {
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary/50" />
          </div>
        </motion.div>
      </div>
    );
  }

  // Not authenticated - show login prompt
  if (!authenticated || !privyUser?.wallet?.address) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-[calc(100vh-160px)] flex items-center justify-center p-4"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-5"
          >
            <CalendarDays className="w-10 h-10 text-primary/50" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-base-content/60 text-lg mb-5 font-medium"
          >
            Connect your wallet to manage events
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={login}
            className="px-6 py-3 bg-primary text-primary-content font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
          >
            Login with Twitter
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Loading state - fetching dashboard data
  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary/50" />
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-base-content/50 text-sm mt-4 font-medium"
          >
            Loading dashboard...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
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
      </div>
    );
  }

  const handleCreateEvent = () => {
    setIsEventModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsEventModalOpen(false);
    refresh();
  };

  const handleStallModalSuccess = () => {
    setIsStallModalOpen(false);
    setQuickAddStallEventId(null);
    refresh();
  };

  // Find event for quick stall add
  const quickAddEvent = quickAddStallEventId ? events.find(e => e.id === quickAddStallEventId) : null;

  return (
    <div className="px-4 py-4 pb-24">
      {/* Hero Revenue Card (or Empty CTA) */}
      <DashboardHero
        mode={mode}
        metrics={metrics}
        onCreateEvent={handleCreateEvent}
        activeContext={activeContext}
        hasDualRole={hasDualRole}
      />

      {/* Live Activity Feed */}
      {mode !== "empty" && (
        <LiveFeed payments={feed} loading={false} operatorStallIds={operatorStalls.map(s => s.id)} />
      )}

      {/* Events & Stalls Lists */}
      {mode !== "empty" && (
        <DashboardControls
          mode={mode}
          events={events}
          eventsWithRevenue={eventsWithRevenue}
          operatorStalls={operatorStalls}
          onRefresh={refresh}
          activeContext={activeContext}
        />
      )}

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSuccess={handleModalSuccess}
        editingEvent={null}
      />

      {/* Stall Modal for Quick Add */}
      {quickAddEvent && (
        <StallModal
          isOpen={isStallModalOpen}
          onClose={() => {
            setIsStallModalOpen(false);
            setQuickAddStallEventId(null);
          }}
          onSuccess={handleStallModalSuccess}
          eventId={quickAddEvent.id}
          eventSlug={quickAddEvent.event_slug}
          editingStall={null}
        />
      )}
    </div>
  );
}

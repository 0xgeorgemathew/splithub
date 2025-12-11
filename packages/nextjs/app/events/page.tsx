"use client";

import { useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { CalendarDays, Sparkles, User } from "lucide-react";
import { DashboardControls } from "~~/components/events/DashboardControls";
import { DashboardHero } from "~~/components/events/DashboardHero";
import { EventModal } from "~~/components/events/EventModal";
import { LiveFeed } from "~~/components/events/LiveFeed";
import { useDashboardRealtime } from "~~/hooks/useDashboardRealtime";

export default function EventsPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const { mode, metrics, feed, events, operatorStalls, loading, error, refresh } = useDashboardRealtime();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Get user avatar/profile from Privy
  const twitterAccount = user?.linkedAccounts?.find(a => a.type === "twitter_oauth");
  const userAvatar = twitterAccount?.profilePictureUrl;
  const userName = twitterAccount?.username;

  // Loading state - Privy not ready
  if (!ready) {
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
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
  if (!authenticated || !user?.wallet?.address) {
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
            Loading your dashboard...
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

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
      {/* ════════════════════════════════════════════════════════════════════════
          PHASE 4: CONTEXT STACK ORCHESTRATION
          ════════════════════════════════════════════════════════════════════════
          1. HEADER      - Dashboard title + user avatar (when not empty)
          2. HERO        - Conditional: Empty CTA | Operator (green) | Owner (gold)
          3. LIVE FEED   - Twitter-style payment ticker (only when active)
          4. CONTROLS    - Management lists based on role
      ════════════════════════════════════════════════════════════════════════ */}

      {/* 1. HEADER AREA - DYNAMIC */}
      {mode !== "empty" && (
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 flex justify-between items-center"
        >
          <h1 className="text-xl font-bold text-base-content">Dashboard</h1>
          {/* User Avatar */}
          <div className="avatar">
            <div className="w-9 h-9 rounded-full ring-2 ring-primary/20">
              {userAvatar ? (
                <Image src={userAvatar} alt={userName || "User"} width={36} height={36} className="rounded-full" />
              ) : (
                <div className="w-full h-full bg-neutral flex items-center justify-center">
                  <User className="w-4 h-4 text-neutral-content" />
                </div>
              )}
            </div>
          </div>
        </motion.header>
      )}

      {/* 2. REVENUE HERO (CONDITIONAL) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={mode !== "empty" ? "mb-6" : ""}
      >
        <DashboardHero mode={mode} metrics={metrics} onCreateEvent={handleCreateEvent} />
      </motion.div>

      {/* 3. LIVE FEED (Only if active - not empty mode) */}
      {mode !== "empty" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <LiveFeed payments={feed} loading={false} />
        </motion.div>
      )}

      {/* 4. MANAGEMENT LISTS (Role-based) */}
      {mode !== "empty" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6"
        >
          <DashboardControls mode={mode} events={events} operatorStalls={operatorStalls} onRefresh={refresh} />
        </motion.div>
      )}

      {/* Event Modal for empty state CTA */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSuccess={handleModalSuccess}
        editingEvent={null}
      />
    </div>
  );
}

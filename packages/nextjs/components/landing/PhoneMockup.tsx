"use client";

import { useEffect, useState } from "react";
import { FriendsAnimation } from "./FriendsAnimation";
import { VenuesAnimation } from "./VenuesAnimation";
import { AnimatePresence, motion } from "framer-motion";

type ActiveTab = "friends" | "venues";

interface PhoneMockupProps {
  showBoth?: boolean;
}

export function PhoneMockup({ showBoth = true }: PhoneMockupProps) {
  const [showTapHand, setShowTapHand] = useState(false);
  const [tapTarget, setTapTarget] = useState<"friends" | "venues">("friends");
  const [mobileTab, setMobileTab] = useState<ActiveTab>("friends");

  // Orchestrate tap animation to sync with FriendsAnimation settle phase
  useEffect(() => {
    const tapDelay = 3000;
    const cycleDuration = 8500;

    const triggerTap = () => {
      setTapTarget("friends");
      setShowTapHand(true);
      setTimeout(() => setShowTapHand(false), 800);
    };

    const initialTimeout = setTimeout(triggerTap, tapDelay);
    const interval = setInterval(triggerTap, cycleDuration);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  // Phone component to avoid duplication
  const PhoneFrame = ({ type, showHand = false }: { type: "friends" | "venues"; showHand?: boolean }) => {
    const isFriends = type === "friends";
    return (
      <div className="relative">
        {/* Phone bezel */}
        <div
          className="relative bg-base-300 rounded-[2.5rem] p-2 shadow-2xl"
          style={{
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.1)",
          }}
        >
          {/* Screen */}
          <div className="relative bg-base-100 rounded-[2rem] overflow-hidden w-[180px] sm:w-[200px] h-[340px] sm:h-[380px]">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-base-300 rounded-b-2xl z-20" />

            {/* Status bar */}
            <div className="absolute top-2 left-4 right-4 flex justify-between items-center z-10 text-[10px] text-base-content/50">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2 border border-base-content/30 rounded-sm">
                  <div className="w-3/4 h-full bg-success rounded-sm" />
                </div>
              </div>
            </div>

            {/* App header */}
            <div className="absolute top-8 left-0 right-0 px-4 z-10">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isFriends ? "bg-primary" : "bg-success"}`} />
                <span className="text-xs font-semibold text-base-content/70">
                  {isFriends ? "Split Bills" : "Event Credits"}
                </span>
              </div>
            </div>

            {/* Animation content */}
            <div className="pt-14 px-2 h-full flex items-start justify-center scale-[0.85] origin-top">
              {isFriends ? <FriendsAnimation /> : <VenuesAnimation />}
            </div>

            {/* NFC Connection Line (appears on tap) - Friends only */}
            {isFriends && (
              <AnimatePresence>
                {showHand && showTapHand && tapTarget === "friends" && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 origin-center"
                  >
                    <svg width="60" height="30" viewBox="0 0 60 30" className="opacity-60">
                      <motion.path
                        d="M10 15 Q30 5 50 15"
                        stroke="url(#nfcGradient)"
                        strokeWidth="2"
                        fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.4 }}
                      />
                      <motion.path
                        d="M15 20 Q30 10 45 20"
                        stroke="url(#nfcGradient)"
                        strokeWidth="2"
                        fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.7 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                      />
                      <defs>
                        <linearGradient id="nfcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f2a900" stopOpacity="0" />
                          <stop offset="50%" stopColor="#f2a900" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-base-content/20 rounded-full" />
        </div>

        {/* Tap Hand Animation - Friends only */}
        {isFriends && showHand && (
          <AnimatePresence>
            {showTapHand && tapTarget === "friends" && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: [20, 0, 5, 0],
                  scale: [0.8, 1, 0.95, 1],
                }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{
                  duration: 0.5,
                  times: [0, 0.4, 0.7, 1],
                  ease: "easeOut",
                }}
                className="absolute bottom-28 right-0 translate-x-1/2 z-30"
              >
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <motion.ellipse
                    cx="24"
                    cy="20"
                    rx="10"
                    ry="16"
                    fill="url(#fingerGradient)"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 0.9, 1] }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  />
                  <motion.circle
                    cx="24"
                    cy="12"
                    r="6"
                    fill="none"
                    stroke="#f2a900"
                    strokeWidth="2"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 2, opacity: [0, 0.8, 0] }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  />
                  <defs>
                    <linearGradient id="fingerGradient" x1="24" y1="4" x2="24" y2="36">
                      <stop offset="0%" stopColor="#e5c9a8" />
                      <stop offset="100%" stopColor="#d4a574" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile: Tabbed view */}
      <div className="sm:hidden flex flex-col items-center">
        {/* Tab switcher */}
        <div className="flex bg-base-300/50 rounded-full p-1 mb-6">
          {(["friends", "venues"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`relative px-5 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                mobileTab === tab ? "text-primary-content" : "text-base-content/60"
              }`}
            >
              {mobileTab === tab && (
                <motion.div
                  layoutId="phoneMockupTab"
                  className={`absolute inset-0 rounded-full ${tab === "friends" ? "bg-primary" : "bg-success"}`}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab === "friends" ? "Split Bills" : "Event Credits"}</span>
            </button>
          ))}
        </div>

        {/* Phone display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mobileTab}
            initial={{ opacity: 0, x: mobileTab === "friends" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mobileTab === "friends" ? 20 : -20 }}
            transition={{ duration: 0.3 }}
          >
            <PhoneFrame type={mobileTab} showHand={mobileTab === "friends"} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop: Side-by-side view */}
      <div className="hidden sm:flex relative items-center justify-center gap-4 lg:gap-8">
        {/* Phone Frame - Friends */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <PhoneFrame type="friends" showHand={true} />
        </motion.div>

        {/* Phone Frame - Venues */}
        {showBoth && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <PhoneFrame type="venues" />
          </motion.div>
        )}

        {/* Connection beam between phones */}
        {showBoth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [0.98, 1.02, 0.98],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-8 h-8 rounded-full bg-primary/20 blur-xl"
            />
          </motion.div>
        )}
      </div>
    </>
  );
}

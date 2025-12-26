"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { NotificationToggle } from "./NotificationToggle";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Copy, LogIn, LogOut, Nfc, Wallet } from "lucide-react";
import { useCurrentUser } from "~~/hooks/useCurrentUser";
import { copyToClipboard as copyText, truncateAddress } from "~~/utils/addressHelpers";

const dropdownItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.2,
      ease: "easeOut",
    },
  }),
};

export const TopNav = () => {
  const { ready, authenticated, login, logout } = usePrivy();
  const { walletAddress, chipAddress, twitterHandle, profilePic } = useCurrentUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleRefresh = () => {
    // Hard refresh the page for PWA
    window.location.reload();
  };

  const handleCopy = async (text: string, field: string) => {
    const success = await copyText(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 25, delay: 0.1 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md md:max-w-lg lg:max-w-xl"
    >
      <motion.div
        className="bg-base-100/95 backdrop-blur-xl rounded-full border border-base-content/10 px-4 py-2"
        style={{
          boxShadow:
            "0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center justify-between">
          {/* Logo - Click to refresh */}
          <motion.button
            onClick={handleRefresh}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1 cursor-pointer"
          >
            <span className="text-2xl font-black tracking-tight">
              Split<span className="text-primary">Hub</span>
            </span>
          </motion.button>

          {/* Auth Section */}
          <AnimatePresence mode="wait">
            {!ready ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-8 h-8 rounded-full bg-base-300/50 animate-pulse"
              />
            ) : !authenticated ? (
              <motion.button
                key="login"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={login}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-full text-sm font-semibold shadow-md shadow-primary/20 transition-shadow hover:shadow-lg hover:shadow-primary/30"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login with Twitter</span>
                <span className="sm:hidden">Login</span>
              </motion.button>
            ) : (
              <motion.div
                key="user"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative"
              >
                {/* Profile Button (Dropdown Anchor) */}
                <motion.button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border transition-all duration-200 ${
                    isDropdownOpen
                      ? "bg-base-200 border-primary/30 shadow-lg shadow-primary/10"
                      : "bg-base-300/50 border-base-content/5 hover:bg-base-300/70"
                  }`}
                >
                  <div className="relative">
                    {profilePic ? (
                      <Image
                        src={profilePic}
                        alt={twitterHandle || "User"}
                        width={28}
                        height={28}
                        className="w-7 h-7 rounded-full ring-2 ring-warning ring-offset-base-100 ring-offset-1"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center ring-2 ring-warning ring-offset-base-100 ring-offset-1">
                        <span className="text-xs font-bold text-primary">
                          {twitterHandle?.charAt(0).toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-base-100" />
                  </div>
                  <motion.div animate={{ rotate: isDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-base-content/50" />
                  </motion.div>
                </motion.button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      ref={dropdownRef}
                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute right-0 top-full mt-2 w-52 z-[101]"
                    >
                      <div
                        className="rounded-xl overflow-hidden border border-white/[0.08]"
                        style={{
                          background: "linear-gradient(160deg, #1c1c1c 0%, #111 100%)",
                          boxShadow: "0 8px 24px -4px rgba(0,0,0,0.6)",
                        }}
                      >
                        {/* Username header */}
                        <div className="px-3 pt-2.5 pb-1">
                          <span className="text-[11px] font-medium text-base-content/50">@{twitterHandle}</span>
                        </div>

                        {/* Address Actions */}
                        <div className="py-1">
                          {/* Wallet Address */}
                          <motion.button
                            custom={0}
                            variants={dropdownItemVariants}
                            initial="hidden"
                            animate="visible"
                            onClick={() => walletAddress && handleCopy(walletAddress, "wallet")}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-colors group"
                          >
                            <Wallet className="w-4 h-4 text-warning/80" />
                            <span className="flex-1 text-xs text-base-content/70 font-mono text-left">
                              {walletAddress ? truncateAddress(walletAddress) : "No wallet"}
                            </span>
                            {walletAddress &&
                              (copiedField === "wallet" ? (
                                <Check className="w-3.5 h-3.5 text-success" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-base-content/30 group-hover:text-base-content/60" />
                              ))}
                          </motion.button>

                          {/* Chip Address */}
                          <motion.button
                            custom={1}
                            variants={dropdownItemVariants}
                            initial="hidden"
                            animate="visible"
                            onClick={() => chipAddress && handleCopy(chipAddress, "chip")}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-colors group"
                          >
                            <Nfc className="w-4 h-4 text-primary/80" />
                            <span className="flex-1 text-xs text-base-content/70 font-mono text-left">
                              {chipAddress ? truncateAddress(chipAddress) : "No chip"}
                            </span>
                            {chipAddress &&
                              (copiedField === "chip" ? (
                                <Check className="w-3.5 h-3.5 text-success" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-base-content/30 group-hover:text-base-content/60" />
                              ))}
                          </motion.button>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-white/[0.06]" />

                        {/* Notification Toggle - Compact */}
                        <motion.div
                          custom={2}
                          variants={dropdownItemVariants}
                          initial="hidden"
                          animate="visible"
                          className="p-2"
                        >
                          <NotificationToggle onAction={() => setIsDropdownOpen(false)} />
                        </motion.div>

                        {/* Divider */}
                        <div className="h-px bg-white/[0.06]" />

                        {/* Logout */}
                        <motion.div
                          custom={3}
                          variants={dropdownItemVariants}
                          initial="hidden"
                          animate="visible"
                          className="p-2"
                        >
                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                              logout();
                            }}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-rose-400/90 hover:bg-rose-500/10 transition-colors text-xs font-medium"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Log out</span>
                          </button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.nav>
  );
};

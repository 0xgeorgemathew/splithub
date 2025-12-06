"use client";

import { useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Copy, CreditCard, LogIn, LogOut, Sparkles, Wallet } from "lucide-react";
import { useCurrentUser } from "~~/hooks/useCurrentUser";

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

  const handleRefresh = () => {
    // Hard refresh the page for PWA
    window.location.reload();
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 25, delay: 0.1 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md"
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
                    <>
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setIsDropdownOpen(false)}
                      />

                      {/* Dropdown */}
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="absolute right-0 top-full mt-3 w-80 z-50"
                      >
                        {/* Dropdown container with dark gradient */}
                        <div className="relative rounded-2xl border border-white/[0.05] overflow-hidden">
                          <div
                            className="relative rounded-2xl overflow-hidden"
                            style={{
                              background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
                              boxShadow: "0 4px 20px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
                            }}
                          >
                            {/* Mesh gradient overlay */}
                            <div
                              className="absolute inset-0 opacity-40 pointer-events-none"
                              style={{
                                backgroundImage:
                                  "radial-gradient(at 20% 30%, rgba(242, 169, 0, 0.12) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(242, 169, 0, 0.08) 0%, transparent 50%)",
                              }}
                            />
                            {/* User Info Header */}
                            <motion.div
                              custom={0}
                              variants={dropdownItemVariants}
                              initial="hidden"
                              animate="visible"
                              className="relative p-5 overflow-hidden z-10"
                            >
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  {profilePic ? (
                                    <Image
                                      src={profilePic}
                                      alt={twitterHandle || "User"}
                                      width={52}
                                      height={52}
                                      className="w-13 h-13 rounded-xl ring-2 ring-primary/20 shadow-lg"
                                    />
                                  ) : (
                                    <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center shadow-lg">
                                      <span className="text-lg font-bold text-primary">
                                        {twitterHandle?.charAt(0).toUpperCase() || "?"}
                                      </span>
                                    </div>
                                  )}
                                  {/* Verified badge */}
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md">
                                    <Sparkles className="w-3 h-3 text-primary-content" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-base-content text-lg">@{twitterHandle}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                    <p className="text-xs text-base-content/50">Connected via Twitter</p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>

                            {/* Divider */}
                            <div className="h-px bg-white/5 relative z-10" />

                            {/* Address Cards */}
                            <div className="p-3 space-y-2 relative z-10">
                              {/* Wallet Address */}
                              <motion.div
                                custom={1}
                                variants={dropdownItemVariants}
                                initial="hidden"
                                animate="visible"
                                className="group p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors cursor-pointer"
                                onClick={() => walletAddress && copyToClipboard(walletAddress, "wallet")}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning/20 to-warning/10 flex items-center justify-center">
                                    <Wallet className="w-5 h-5 text-warning" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-base-content/40 uppercase tracking-wider">
                                      Wallet Address
                                    </p>
                                    <p className="text-sm font-mono text-base-content truncate">
                                      {walletAddress ? truncateAddress(walletAddress) : "Not connected"}
                                    </p>
                                  </div>
                                  {walletAddress && (
                                    <motion.div
                                      initial={false}
                                      animate={{
                                        scale: copiedField === "wallet" ? [1, 1.2, 1] : 1,
                                      }}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors"
                                    >
                                      {copiedField === "wallet" ? (
                                        <Check className="w-4 h-4 text-[#00E0B8]" />
                                      ) : (
                                        <Copy className="w-4 h-4 text-white/40 group-hover:text-white/70" />
                                      )}
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>

                              {/* Chip Address */}
                              <motion.div
                                custom={2}
                                variants={dropdownItemVariants}
                                initial="hidden"
                                animate="visible"
                                className="group p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors cursor-pointer"
                                onClick={() => chipAddress && copyToClipboard(chipAddress, "chip")}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-base-content/40 uppercase tracking-wider">
                                      NFC Chip
                                    </p>
                                    <p className="text-sm font-mono text-base-content truncate">
                                      {chipAddress ? truncateAddress(chipAddress) : "Not registered"}
                                    </p>
                                  </div>
                                  {chipAddress && (
                                    <motion.div
                                      initial={false}
                                      animate={{
                                        scale: copiedField === "chip" ? [1, 1.2, 1] : 1,
                                      }}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors"
                                    >
                                      {copiedField === "chip" ? (
                                        <Check className="w-4 h-4 text-[#00E0B8]" />
                                      ) : (
                                        <Copy className="w-4 h-4 text-white/40 group-hover:text-white/70" />
                                      )}
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-white/5 relative z-10" />

                            {/* Logout Button */}
                            <motion.div
                              custom={3}
                              variants={dropdownItemVariants}
                              initial="hidden"
                              animate="visible"
                              className="p-3 relative z-10"
                            >
                              <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  logout();
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold transition-colors border border-rose-500/10"
                              >
                                <LogOut className="w-4 h-4" />
                                <span>Log out</span>
                              </motion.button>
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    </>
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

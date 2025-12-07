"use client";

import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { Sparkles, Wallet } from "lucide-react";
import { EnableNotificationsButton } from "~~/components/EnableNotificationsButton";
import { CircleSection } from "~~/components/home/CircleSection";
import { FriendBalancesList } from "~~/components/home/FriendBalancesList";

export default function SplitsPage() {
  const { ready, authenticated, user, login } = usePrivy();

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
            <Wallet className="w-10 h-10 text-primary/50" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-base-content/60 text-lg mb-5 font-medium"
          >
            Connect your wallet to view splits
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

  return (
    <div className="px-4 py-4 pb-8">
      <EnableNotificationsButton />
      <CircleSection />
      <FriendBalancesList />
    </div>
  );
}

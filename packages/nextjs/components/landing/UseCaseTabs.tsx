"use client";

import { useState } from "react";
import { FriendsAnimation } from "./FriendsAnimation";
import { VenuesAnimation } from "./VenuesAnimation";
import { AnimatePresence, motion } from "framer-motion";

type UseCase = "friends" | "venues";

export function UseCaseTabs() {
  const [activeTab, setActiveTab] = useState<UseCase>("friends");

  return (
    <div className="flex flex-col items-center w-full">
      {/* Tab switcher */}
      <div className="flex bg-base-300/50 rounded-full p-1 mb-6">
        {(["friends", "venues"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-5 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
              activeTab === tab ? "text-primary-content" : "text-base-content/60 hover:text-base-content"
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-primary rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab === "friends" ? "Split Bills" : "Event Credits"}</span>
          </button>
        ))}
      </div>

      {/* Content area - height matches animation components */}
      <div className="w-full max-w-[260px] h-[240px] flex items-start justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "friends" ? (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <FriendsAnimation />
            </motion.div>
          ) : (
            <motion.div
              key="venues"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <VenuesAnimation />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tab label */}
      <motion.p
        key={activeTab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-base-content/50 text-center mt-2"
      >
        {activeTab === "friends" ? "Settle debts instantly" : "Tap to pay at events"}
      </motion.p>
    </div>
  );
}

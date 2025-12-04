"use client";

import { FriendsAnimation } from "./FriendsAnimation";
import { UseCaseTabs } from "./UseCaseTabs";
import { VenuesAnimation } from "./VenuesAnimation";
import { motion } from "framer-motion";

export function DualHeroAnimation() {
  return (
    <>
      {/* Mobile: Tabbed view */}
      <div className="sm:hidden w-full">
        <UseCaseTabs />
      </div>

      {/* Desktop: Side-by-side view */}
      <div className="hidden sm:flex items-start justify-center gap-8 lg:gap-12">
        {/* Left: Split with Friends */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center flex-1 max-w-[320px]"
        >
          {/* Section label */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-medium text-base-content/70 uppercase tracking-wider">Split Bills</span>
          </div>

          {/* Animation container - consistent sizing */}
          <div className="relative bg-base-200/30 rounded-2xl p-4 w-full overflow-hidden">
            <FriendsAnimation />
          </div>

          {/* Caption */}
          <p className="text-xs text-base-content/40 mt-3 text-center">Settle debts instantly</p>
        </motion.div>

        {/* Right: Event Credits */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center flex-1 max-w-[320px]"
        >
          {/* Section label */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-sm font-medium text-base-content/70 uppercase tracking-wider">Event Credits</span>
          </div>

          {/* Animation container - consistent sizing */}
          <div className="relative bg-base-200/30 rounded-2xl p-4 w-full overflow-hidden">
            <VenuesAnimation />
          </div>

          {/* Caption */}
          <p className="text-xs text-base-content/40 mt-3 text-center">Tap to pay at venues</p>
        </motion.div>
      </div>
    </>
  );
}

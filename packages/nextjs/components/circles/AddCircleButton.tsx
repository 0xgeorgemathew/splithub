"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

interface AddCircleButtonProps {
  onClick: () => void;
}

/**
 * Add new circle button for the circles horizontal scroll.
 */
export const AddCircleButton = ({ onClick }: AddCircleButtonProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center gap-2"
  >
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClick} className="relative">
      <div className="p-1 rounded-full bg-base-300/30">
        <div className="w-[60px] h-[60px] rounded-full border-2 border-dashed border-base-content/20 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-colors">
          <Plus className="w-6 h-6 text-base-content/40" />
        </div>
      </div>
    </motion.button>
    <span className="text-xs font-medium text-base-content/50 text-center">
      Add New
      <br />
      Circle
    </span>
  </motion.div>
);

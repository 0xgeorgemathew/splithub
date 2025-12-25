"use client";

import { useState } from "react";
import { CircleCollage } from "./CircleCollage";
import { motion } from "framer-motion";
import { Check, Eye, Settings2 } from "lucide-react";
import { RadialActionMenu } from "~~/components/home/RadialActionMenu";
import { type CircleWithMembersAndOwnership } from "~~/lib/supabase";

interface CircleItemProps {
  circle: CircleWithMembersAndOwnership;
  onSelect: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Individual circle item for the horizontal scroll.
 * Shows owner controls and active state indicators.
 */
export const CircleItem = ({ circle, onSelect, onToggleActive, onEdit, onDelete }: CircleItemProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isOwner = circle.isOwner;
  const showActiveState = isOwner && circle.is_active;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2 relative"
    >
      {/* Menu trigger - only show for owners */}
      {isOwner && (
        <div className="absolute -top-0.5 -right-0.5 z-10">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
              isMenuOpen ? "bg-primary text-primary-content" : "bg-base-300/90 backdrop-blur-sm hover:bg-base-300"
            }`}
          >
            <Settings2 className={`w-2.5 h-2.5 ${isMenuOpen ? "" : "text-base-content/60"}`} />
          </motion.button>

          <RadialActionMenu
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            isActive={circle.is_active}
            onToggleActive={onToggleActive}
            onEdit={onEdit}
            onDelete={onDelete}
            triggerSize={20}
          />
        </div>
      )}

      {/* Circle with ring */}
      {isOwner ? (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSelect}
          className="relative cursor-pointer"
        >
          <div
            className={`p-1 rounded-full ${
              showActiveState ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-base-300/50"
            }`}
          >
            <div className="rounded-full bg-base-100 p-0.5">
              <CircleCollage members={circle.members} size={56} />
            </div>
          </div>

          {showActiveState && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-base-100"
            >
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </motion.button>
      ) : (
        <div className="relative cursor-default" title="Shared with you">
          <div className="p-1 rounded-full bg-base-300/50">
            <div className="rounded-full bg-base-100 p-0.5">
              <CircleCollage members={circle.members} size={56} />
            </div>
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-full bg-slate-500 flex items-center justify-center ring-2 ring-base-100"
            title="Shared with you"
          >
            <Eye className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
          </motion.div>
        </div>
      )}

      {/* Circle name */}
      <span className="text-xs font-medium text-base-content/70 text-center max-w-[80px] truncate">{circle.name}</span>
    </motion.div>
  );
};

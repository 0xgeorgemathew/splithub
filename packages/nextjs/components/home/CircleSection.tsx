"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CircleModal } from "./CircleModal";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Edit3, MoreHorizontal, Plus, Power, Trash2, Users } from "lucide-react";
import { type CircleWithMembers, type User } from "~~/lib/supabase";
import { deleteCircle, getCircleWithMembers, getCirclesByCreator, setCircleActive } from "~~/services/circleService";

// Avatar component for consistent rendering
const MemberAvatar = ({ member, size, className = "" }: { member: User; size: number; className?: string }) => (
  <div
    className={`rounded-full overflow-hidden ring-2 ring-base-100 ${className}`}
    style={{ width: size, height: size }}
  >
    {member.twitter_profile_url ? (
      <Image
        src={member.twitter_profile_url}
        alt={member.name}
        width={size}
        height={size}
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center">
        <span className="font-bold text-primary" style={{ fontSize: size * 0.4 }}>
          {member.name.charAt(0).toUpperCase()}
        </span>
      </div>
    )}
  </div>
);

// Circle visualization with overlapping avatars
const CircleCollage = ({ members, size = 80 }: { members: User[]; size?: number }) => {
  const memberCount = members.length;

  // Empty state
  if (memberCount === 0) {
    return (
      <div
        className="rounded-full bg-gradient-to-br from-base-300/60 to-base-300/30 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Users className="w-1/3 h-1/3 text-base-content/40" />
      </div>
    );
  }

  // Single member - full circle
  if (memberCount === 1) {
    return (
      <div className="rounded-full overflow-hidden" style={{ width: size, height: size }}>
        {members[0].twitter_profile_url ? (
          <Image
            src={members[0].twitter_profile_url}
            alt={members[0].name}
            width={size}
            height={size}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">{members[0].name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
    );
  }

  // 2 members - horizontal centered overlap
  if (memberCount === 2) {
    const avatarSize = size * 0.55;
    return (
      <div
        className="rounded-full bg-gradient-to-br from-base-300/40 to-base-300/20 relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="flex items-center">
          <MemberAvatar member={members[0]} size={avatarSize} />
          <div style={{ marginLeft: -avatarSize * 0.25 }}>
            <MemberAvatar member={members[1]} size={avatarSize} />
          </div>
        </div>
      </div>
    );
  }

  // 3 members - triangle arrangement
  if (memberCount === 3) {
    const avatarSize = size * 0.48;
    return (
      <div
        className="rounded-full bg-gradient-to-br from-base-300/40 to-base-300/20 relative"
        style={{ width: size, height: size }}
      >
        {/* Top center */}
        <div className="absolute" style={{ top: size * 0.08, left: "50%", transform: "translateX(-50%)" }}>
          <MemberAvatar member={members[0]} size={avatarSize} />
        </div>
        {/* Bottom left */}
        <div className="absolute" style={{ bottom: size * 0.08, left: size * 0.08 }}>
          <MemberAvatar member={members[1]} size={avatarSize} />
        </div>
        {/* Bottom right */}
        <div className="absolute" style={{ bottom: size * 0.08, right: size * 0.08 }}>
          <MemberAvatar member={members[2]} size={avatarSize} />
        </div>
      </div>
    );
  }

  // 4+ members - stacked fan arrangement
  const avatarSize = size * 0.45;
  const displayMembers = members.slice(0, 4);
  const remaining = memberCount - 4;

  return (
    <div
      className="rounded-full bg-gradient-to-br from-base-300/40 to-base-300/20 relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Stacked avatars in a slight arc */}
      <div className="relative" style={{ width: avatarSize * 2, height: avatarSize }}>
        {displayMembers.slice(0, 3).map((member, i) => (
          <div
            key={member.wallet_address}
            className="absolute"
            style={{
              left: i * (avatarSize * 0.5),
              zIndex: 3 - i,
              transform: `rotate(${(i - 1) * 5}deg)`,
            }}
          >
            <MemberAvatar member={member} size={avatarSize} />
          </div>
        ))}
      </div>

      {/* Remaining count badge */}
      {remaining > 0 && (
        <div
          className="absolute bottom-1 right-1 bg-base-300 rounded-full flex items-center justify-center ring-2 ring-base-100"
          style={{ width: size * 0.32, height: size * 0.32 }}
        >
          <span className="text-[10px] font-bold text-base-content/70">+{remaining}</span>
        </div>
      )}
    </div>
  );
};

// Individual circle item for the horizontal scroll
const CircleItem = ({
  circle,
  onSelect,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  circle: CircleWithMembers;
  onSelect: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2 relative"
    >
      {/* Menu button */}
      <div className="absolute -top-1 -right-1 z-10" ref={menuRef}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="w-6 h-6 rounded-full bg-base-300/80 backdrop-blur-sm flex items-center justify-center hover:bg-base-300 transition-colors"
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-base-content/60" />
        </motion.button>

        {/* Dropdown menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 5 }}
              className="absolute right-0 bottom-8 bg-base-200 rounded-xl shadow-xl border border-base-300 overflow-hidden min-w-[140px] z-50"
            >
              <button
                onClick={e => {
                  e.stopPropagation();
                  onToggleActive();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-base-content hover:bg-base-300 transition-colors"
              >
                <Power className="w-4 h-4" />
                {circle.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onEdit();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-base-content hover:bg-base-300 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-error hover:bg-error/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Circle with ring */}
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onSelect} className="relative">
        {/* Ring */}
        <div
          className={`p-1 rounded-full ${
            circle.is_active ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-base-300/50"
          }`}
        >
          <div className="rounded-full bg-base-100 p-0.5">
            <CircleCollage members={circle.members} size={56} />
          </div>
        </div>

        {/* Active checkmark */}
        {circle.is_active && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-base-100"
          >
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </motion.div>
        )}
      </motion.button>

      {/* Circle name */}
      <span className="text-xs font-medium text-base-content/70 text-center max-w-[80px] truncate">{circle.name}</span>
    </motion.div>
  );
};

// Add new circle button
const AddCircleButton = ({ onClick }: { onClick: () => void }) => (
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

export const CircleSection = () => {
  const { user } = usePrivy();
  const [circles, setCircles] = useState<CircleWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircle, setEditingCircle] = useState<CircleWithMembers | null>(null);

  const walletAddress = user?.wallet?.address;

  const fetchCircles = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const userCircles = await getCirclesByCreator(walletAddress);

      const circlesWithMembers: CircleWithMembers[] = [];
      for (const circle of userCircles) {
        const withMembers = await getCircleWithMembers(circle.id);
        if (withMembers) {
          circlesWithMembers.push(withMembers);
        }
      }

      setCircles(circlesWithMembers);
    } catch (err) {
      console.error("Error fetching circles:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchCircles();
  }, [fetchCircles]);

  const handleCreateCircle = () => {
    setEditingCircle(null);
    setIsModalOpen(true);
  };

  const handleEditCircle = (circle: CircleWithMembers) => {
    setEditingCircle(circle);
    setIsModalOpen(true);
  };

  const handleDeleteCircle = async (circleId: string) => {
    // Optimistically remove from UI
    setCircles(prev => prev.filter(c => c.id !== circleId));

    try {
      await deleteCircle(circleId);
    } catch (err) {
      console.error("Error deleting circle:", err);
      // Refetch on error to restore
      fetchCircles();
    }
  };

  const handleToggleActive = async (circle: CircleWithMembers) => {
    if (!walletAddress) return;

    // Optimistically update local state
    setCircles(prev => prev.map(c => (c.id === circle.id ? { ...c, is_active: !c.is_active } : c)));

    try {
      await setCircleActive(circle.id, walletAddress, !circle.is_active);
    } catch (err) {
      console.error("Error toggling circle:", err);
      // Revert on error
      setCircles(prev => prev.map(c => (c.id === circle.id ? { ...c, is_active: circle.is_active } : c)));
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCircle(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    fetchCircles();
  };

  const handleSelectCircle = (circle: CircleWithMembers) => {
    // Toggle active state when clicking on circle
    handleToggleActive(circle);
  };

  if (loading) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wider mb-3 px-1">Circles</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 px-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-base-300/50 animate-pulse" />
              <div className="w-12 h-3 rounded bg-base-300/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Header */}
      <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wider mb-3 px-1">Circles</h3>

      {/* Wrapper for overflow handling */}
      <div className="relative">
        {/* Horizontal scroll container with top padding for dropdown */}
        <div className="flex gap-4 pt-32 -mt-32 pb-2 px-1 overflow-x-auto scrollbar-hide">
          {circles.map(circle => (
            <CircleItem
              key={circle.id}
              circle={circle}
              onSelect={() => handleSelectCircle(circle)}
              onToggleActive={() => handleToggleActive(circle)}
              onEdit={() => handleEditCircle(circle)}
              onDelete={() => handleDeleteCircle(circle.id)}
            />
          ))}

          {/* Add new circle button */}
          <AddCircleButton onClick={handleCreateCircle} />
        </div>
      </div>

      {/* Modal */}
      <CircleModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingCircle={editingCircle}
      />
    </div>
  );
};

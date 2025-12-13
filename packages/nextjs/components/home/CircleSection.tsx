"use client";

import { useState } from "react";
import Image from "next/image";
import { CircleModal } from "./CircleModal";
import { RadialActionMenu } from "./RadialActionMenu";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { Check, Eye, Plus, Settings2, Users } from "lucide-react";
import { useCirclesRealtime } from "~~/hooks/useCirclesRealtime";
import { type CircleWithMembersAndOwnership, type User as UserType } from "~~/lib/supabase";
import { deleteCircle, setCircleActive } from "~~/services/circleService";

// Avatar component for consistent rendering
const MemberAvatar = ({ member, size, className = "" }: { member: UserType; size: number; className?: string }) => (
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
const CircleCollage = ({ members, size = 80 }: { members: UserType[]; size?: number }) => {
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
  circle: CircleWithMembersAndOwnership;
  onSelect: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isOwner = circle.isOwner;

  // Logic Rule 2: Active state only applies to owners
  const showActiveState = isOwner && circle.is_active;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2 relative"
    >
      {/* Menu trigger - only show for owners (Step 2: Settings Access) */}
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

          {/* Radial Action Menu */}
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
        // Owner: Interactive button with hover/tap effects
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSelect}
          className="relative cursor-pointer"
        >
          {/* Ring - gradient only for owner's active circles (Step 2: Ring Styling) */}
          <div
            className={`p-1 rounded-full ${
              showActiveState ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-base-300/50"
            }`}
          >
            <div className="rounded-full bg-base-100 p-0.5">
              <CircleCollage members={circle.members} size={56} />
            </div>
          </div>

          {/* Active checkmark - only for owner when active (Step 2: Active Indicator) */}
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
        // Member: Non-interactive, view-only state (Step 3: Interaction Lock)
        <div className="relative cursor-default" title="Shared with you">
          {/* Ring - always inactive style for members (Step 3: Ambiguity Fix) */}
          <div className="p-1 rounded-full bg-base-300/50">
            <div className="rounded-full bg-base-100 p-0.5">
              <CircleCollage members={circle.members} size={56} />
            </div>
          </div>

          {/* View-only indicator - bottom-left (Step 3: Status Badge) */}
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
  const { circles, loading, refresh: refreshCircles } = useCirclesRealtime();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircle, setEditingCircle] = useState<CircleWithMembersAndOwnership | null>(null);

  const walletAddress = user?.wallet?.address;

  const handleCreateCircle = () => {
    setEditingCircle(null);
    setIsModalOpen(true);
  };

  const handleEditCircle = (circle: CircleWithMembersAndOwnership) => {
    setEditingCircle(circle);
    setIsModalOpen(true);
  };

  const handleDeleteCircle = async (circleId: string) => {
    try {
      await deleteCircle(circleId);
      // Real-time subscription will auto-update the list
    } catch (err) {
      console.error("Error deleting circle:", err);
      // Refetch on error to restore
      refreshCircles();
    }
  };

  const handleToggleActive = async (circle: CircleWithMembersAndOwnership) => {
    if (!walletAddress || !circle.isOwner) return;

    try {
      await setCircleActive(circle.id, walletAddress, !circle.is_active);
      // Real-time subscription will auto-update the list
    } catch (err) {
      console.error("Error toggling circle:", err);
      // Refetch on error
      refreshCircles();
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCircle(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    // Real-time subscription will auto-update, but manual refresh for immediate feedback
    refreshCircles();
  };

  const handleSelectCircle = (circle: CircleWithMembersAndOwnership) => {
    // Only owners can toggle active state
    if (circle.isOwner) {
      handleToggleActive(circle);
    }
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

      {/* Horizontal scroll container */}
      <div className="flex gap-6 pb-2 px-1 overflow-x-auto scrollbar-hide">
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

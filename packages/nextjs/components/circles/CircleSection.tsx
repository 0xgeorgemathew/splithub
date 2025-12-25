"use client";

import { useState } from "react";
import { AddCircleButton } from "./AddCircleButton";
import { CircleItem } from "./CircleItem";
import { usePrivy } from "@privy-io/react-auth";
import { CircleModal } from "~~/components/home/CircleModal";
import { useCirclesRealtime } from "~~/hooks/useCirclesRealtime";
import { type CircleWithMembersAndOwnership } from "~~/lib/supabase";
import { deleteCircle, setCircleActive } from "~~/services/circleService";

/**
 * Circle section showing user's circles in a horizontal scrollable list.
 * Supports creating, editing, deleting, and toggling active state.
 */
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
    } catch (err) {
      console.error("Error deleting circle:", err);
      refreshCircles();
    }
  };

  const handleToggleActive = async (circle: CircleWithMembersAndOwnership) => {
    if (!walletAddress || !circle.isOwner) return;

    try {
      await setCircleActive(circle.id, walletAddress, !circle.is_active);
    } catch (err) {
      console.error("Error toggling circle:", err);
      refreshCircles();
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCircle(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    refreshCircles();
  };

  const handleSelectCircle = (circle: CircleWithMembersAndOwnership) => {
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
      <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wider mb-3 px-1">Circles</h3>

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
        <AddCircleButton onClick={handleCreateCircle} />
      </div>

      <CircleModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingCircle={editingCircle}
      />
    </div>
  );
};

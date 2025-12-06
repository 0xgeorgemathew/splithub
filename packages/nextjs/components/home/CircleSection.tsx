"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { CircleModal } from "./CircleModal";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { ChevronRight, Plus, Power, Trash2, Users } from "lucide-react";
import { type CircleWithMembers } from "~~/lib/supabase";
import { deleteCircle, getCircleWithMembers, getCirclesByCreator, setCircleActive } from "~~/services/circleService";

export const CircleSection = () => {
  const { user } = usePrivy();
  const [circles, setCircles] = useState<CircleWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircle, setEditingCircle] = useState<CircleWithMembers | null>(null);
  const [expandedCircleId, setExpandedCircleId] = useState<string | null>(null);

  const walletAddress = user?.wallet?.address;

  const fetchCircles = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const userCircles = await getCirclesByCreator(walletAddress);

      // Fetch members for each circle
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
    if (!confirm("Are you sure you want to delete this circle?")) return;

    try {
      await deleteCircle(circleId);
      await fetchCircles();
    } catch (err) {
      console.error("Error deleting circle:", err);
    }
  };

  const handleToggleActive = async (circle: CircleWithMembers) => {
    if (!walletAddress) return;

    try {
      await setCircleActive(circle.id, walletAddress, !circle.is_active);
      await fetchCircles();
    } catch (err) {
      console.error("Error toggling circle:", err);
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

  const toggleExpand = (circleId: string) => {
    setExpandedCircleId(prev => (prev === circleId ? null : circleId));
  };

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">Circles</span>
          </div>
        </div>
        <div className="h-16 bg-base-200/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">Circles</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreateCircle}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Circle
        </motion.button>
      </div>

      {/* Circles List */}
      {circles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-dashed border-base-300 p-6 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-base-content/30" />
          </div>
          <p className="text-sm text-base-content/50 mb-3">No circles yet</p>
          <button onClick={handleCreateCircle} className="text-sm text-primary font-medium hover:underline">
            Create your first circle
          </button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {circles.map(circle => {
            const isExpanded = expandedCircleId === circle.id;

            return (
              <motion.div
                key={circle.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl overflow-hidden transition-all ${
                  circle.is_active
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-base-200/50 border border-transparent"
                }`}
              >
                {/* Circle Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleExpand(circle.id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <div
                      className={`w-2 h-2 rounded-full ${
                        circle.is_active ? "bg-primary animate-pulse" : "bg-base-content/20"
                      }`}
                    />

                    {/* Circle info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base-content">{circle.name}</span>
                        {circle.is_active && (
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Active</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {/* Member avatars */}
                        <div className="flex -space-x-2">
                          {circle.members.slice(0, 3).map((member, i) =>
                            member.twitter_profile_url ? (
                              <Image
                                key={member.wallet_address}
                                src={member.twitter_profile_url}
                                alt={member.name}
                                width={20}
                                height={20}
                                className="w-5 h-5 rounded-full border-2 border-base-100"
                                style={{ zIndex: 3 - i }}
                              />
                            ) : (
                              <div
                                key={member.wallet_address}
                                className="w-5 h-5 rounded-full bg-base-300 border-2 border-base-100 flex items-center justify-center"
                                style={{ zIndex: 3 - i }}
                              >
                                <span className="text-[8px] font-bold text-base-content/60">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                        <span className="text-xs text-base-content/50 ml-1">
                          {circle.members.length} {circle.members.length === 1 ? "member" : "members"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-5 h-5 text-base-content/40 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-base-300/50"
                  >
                    {/* Members list */}
                    <div className="p-4 pt-3">
                      <p className="text-xs text-base-content/50 uppercase tracking-wider mb-2">Members</p>
                      <div className="space-y-2">
                        {circle.members.map(member => (
                          <div key={member.wallet_address} className="flex items-center gap-2">
                            {member.twitter_profile_url ? (
                              <Image
                                src={member.twitter_profile_url}
                                alt={member.name}
                                width={28}
                                height={28}
                                className="w-7 h-7 rounded-full"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-base-300 flex items-center justify-center">
                                <span className="text-xs font-bold text-base-content/60">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-medium text-base-content">{member.name}</span>
                              {member.twitter_handle && (
                                <span className="text-xs text-base-content/50 ml-1">@{member.twitter_handle}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 p-4 pt-0">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleActive(circle);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          circle.is_active
                            ? "bg-base-300/50 text-base-content/70 hover:bg-base-300"
                            : "bg-primary text-primary-content hover:bg-primary/90"
                        }`}
                      >
                        <Power className="w-4 h-4" />
                        {circle.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleEditCircle(circle);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-base-300/50 text-base-content/70 hover:bg-base-300 text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteCircle(circle.id);
                        }}
                        className="p-2.5 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

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

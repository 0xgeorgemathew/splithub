"use client";

import { useState } from "react";
import Image from "next/image";
import { StallModal } from "./StallModal";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Copy,
  DollarSign,
  Edit2,
  ExternalLink,
  Pause,
  Play,
  Plus,
  Store,
  Trash2,
  User,
} from "lucide-react";
import { useStallPaymentsRealtime } from "~~/hooks/useEventsRealtime";
import type { Event, Stall } from "~~/lib/events.types";
import { deleteStall, updateStall } from "~~/services/eventsService";

interface StallSectionProps {
  event: Event & { stalls?: Stall[]; totalRevenue: number };
  onEditEvent: () => void;
  onRefresh: () => void;
}

const StallCard = ({
  stall,
  eventSlug,
  onEdit,
  onDelete,
  onRefresh,
}: {
  stall: Stall;
  eventSlug: string;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { payments, loading: loadingPayments } = useStallPaymentsRealtime(isExpanded ? stall.id : null);

  const publicUrl = `/events/${eventSlug}/${stall.stall_slug}`;

  const copyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateStall(stall.id, {
        status: stall.status === "active" ? "paused" : "active",
      });
      onRefresh();
    } catch (err) {
      console.error("Error toggling stall status:", err);
    }
  };

  // Calculate stall revenue from payments
  const stallRevenue = payments
    .filter(p => p.status === "completed")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl overflow-hidden transition-all ${
        stall.status === "active"
          ? "bg-base-100/80 border border-emerald-500/20"
          : "bg-base-100/40 border border-transparent"
      }`}
    >
      {/* Stall Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-base-300/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Status dot */}
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              stall.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-warning"
            }`}
          />

          {/* Operator avatar */}
          {stall.operator_user?.twitter_profile_url ? (
            <Image
              src={stall.operator_user.twitter_profile_url}
              alt={stall.operator_twitter_handle}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 text-primary" />
            </div>
          )}

          {/* Stall info */}
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm text-base-content truncate block">{stall.stall_name}</span>
            <span className="text-[11px] text-base-content/50">@{stall.operator_twitter_handle}</span>
          </div>
        </div>

        {/* Quick Actions - matching event cards */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Activate/Deactivate Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleStatus}
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              stall.status === "active"
                ? "bg-warning/10 hover:bg-warning/20"
                : "bg-emerald-500/10 hover:bg-emerald-500/20"
            }`}
            title={stall.status === "active" ? "Pause stall" : "Activate stall"}
          >
            {stall.status === "active" ? (
              <Pause className="w-3 h-3 text-warning" />
            ) : (
              <Play className="w-3 h-3 text-emerald-500" />
            )}
          </motion.button>

          {/* Edit */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onEdit();
            }}
            className="w-6 h-6 rounded-lg bg-base-300/50 hover:bg-base-300 flex items-center justify-center transition-colors"
            title="Edit stall"
          >
            <Edit2 className="w-3 h-3 text-base-content/50" />
          </motion.button>

          {/* Delete */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-6 h-6 rounded-lg bg-base-300/50 hover:bg-error/20 flex items-center justify-center transition-colors group"
            title="Delete stall"
          >
            <Trash2 className="w-3 h-3 text-base-content/40 group-hover:text-error" />
          </motion.button>

          {/* Expand/Collapse */}
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-6 h-6 rounded-lg bg-base-300/50 flex items-center justify-center"
          >
            <ChevronRight className="w-3.5 h-3.5 text-base-content/40" />
          </motion.div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-base-300/30 overflow-hidden"
          >
            <div className="p-3 space-y-3">
              {/* Public URL */}
              <div className="flex items-center gap-2 p-2 bg-base-200/50 rounded-lg">
                <ExternalLink className="w-3.5 h-3.5 text-base-content/40 flex-shrink-0" />
                <span className="text-[11px] text-base-content/60 truncate flex-1 font-mono">{publicUrl}</span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={copyUrl}
                  className="p-1.5 rounded-md bg-base-300/50 hover:bg-base-300 transition-colors"
                >
                  {copied ? (
                    <span className="text-[10px] text-emerald-400 font-medium px-1">Copied!</span>
                  ) : (
                    <Copy className="w-3 h-3 text-base-content/50" />
                  )}
                </motion.button>
                <a
                  href={publicUrl}
                  onClick={e => e.stopPropagation()}
                  className="p-1.5 rounded-md bg-primary/20 hover:bg-primary/30 transition-colors"
                >
                  <ExternalLink className="w-3 h-3 text-primary" />
                </a>
              </div>

              {/* Revenue Stats */}
              <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider mb-1">Total Revenue</div>
                <div className="text-sm font-bold text-emerald-400 font-mono flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {stallRevenue.toFixed(2)}
                </div>
              </div>

              {/* Recent Payments */}
              {loadingPayments ? (
                <div className="flex items-center justify-center py-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full"
                  />
                </div>
              ) : payments.length > 0 ? (
                <div>
                  <div className="text-[10px] text-base-content/40 uppercase tracking-wider mb-2">Recent Payments</div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {payments.slice(0, 5).map(payment => (
                      <div key={payment.id} className="flex items-center justify-between p-2 bg-base-200/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          {payment.payer_user?.twitter_profile_url ? (
                            <Image
                              src={payment.payer_user.twitter_profile_url}
                              alt="payer"
                              width={20}
                              height={20}
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                              <User className="w-3 h-3 text-primary" />
                            </div>
                          )}
                          <span className="text-[11px] text-base-content/70">
                            {payment.payer_user?.twitter_handle
                              ? `@${payment.payer_user.twitter_handle}`
                              : payment.payer_wallet.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-medium text-emerald-400">
                            +${parseFloat(payment.amount.toString()).toFixed(2)}
                          </span>
                          {payment.status === "completed" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-[11px] text-base-content/40">No payments yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const StallSection = ({ event, onEditEvent, onRefresh }: StallSectionProps) => {
  const [isStallModalOpen, setIsStallModalOpen] = useState(false);
  const [editingStall, setEditingStall] = useState<Stall | null>(null);
  const [deletingStall, setDeletingStall] = useState<Stall | null>(null);

  const stalls = event.stalls || [];

  const handleAddStall = () => {
    setEditingStall(null);
    setIsStallModalOpen(true);
  };

  const handleEditStall = (stall: Stall) => {
    setEditingStall(stall);
    setIsStallModalOpen(true);
  };

  const handleDeleteStall = (stall: Stall) => {
    setDeletingStall(stall);
  };

  const confirmDeleteStall = async () => {
    if (!deletingStall) return;
    try {
      await deleteStall(deletingStall.id);
      setDeletingStall(null);
      onRefresh();
    } catch (error) {
      console.error("Failed to delete stall:", error);
    }
  };

  const handleStallModalSuccess = () => {
    setIsStallModalOpen(false);
    setEditingStall(null);
    onRefresh();
  };

  return (
    <div className="p-4">
      {/* Event Actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Store className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Stalls</span>
          <span className="text-[10px] text-base-content/40 bg-base-300/50 px-1.5 py-0.5 rounded-full">
            {stalls.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEditEvent}
            className="p-1.5 rounded-lg bg-base-300/50 hover:bg-base-300 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-base-content/50" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddStall}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[11px] font-semibold transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Stall
          </motion.button>
        </div>
      </div>

      {/* Stalls List */}
      {stalls.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-6 rounded-xl border border-dashed border-base-300"
        >
          <div className="w-10 h-10 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-2">
            <Store className="w-5 h-5 text-base-content/30" />
          </div>
          <p className="text-xs text-base-content/50 mb-2">No stalls yet</p>
          <button onClick={handleAddStall} className="text-xs text-primary font-medium hover:underline">
            Create your first stall
          </button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {stalls.map(stall => (
            <StallCard
              key={stall.id}
              stall={stall}
              eventSlug={event.event_slug}
              onEdit={() => handleEditStall(stall)}
              onDelete={() => handleDeleteStall(stall)}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Stall Modal */}
      <StallModal
        isOpen={isStallModalOpen}
        onClose={() => {
          setIsStallModalOpen(false);
          setEditingStall(null);
        }}
        onSuccess={handleStallModalSuccess}
        eventId={event.id}
        eventSlug={event.event_slug}
        editingStall={editingStall}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingStall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeletingStall(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-base-200 rounded-2xl p-5 max-w-sm w-full shadow-xl border border-base-300"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-error" />
                </div>
                <div>
                  <h3 className="font-semibold text-base-content">Delete Stall</h3>
                  <p className="text-xs text-base-content/50">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-sm text-base-content/70 mb-5">
                Are you sure you want to delete{" "}
                <span className="font-medium text-base-content">{deletingStall.stall_name}</span>? All payment history
                for this stall will be permanently removed.
              </p>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeletingStall(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-base-300 hover:bg-base-300/80 text-sm font-medium transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmDeleteStall}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-error hover:bg-error/90 text-error-content text-sm font-medium transition-colors"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

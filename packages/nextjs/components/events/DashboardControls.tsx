"use client";

import { useState } from "react";
import { EventModal } from "./EventModal";
import { StallSection } from "./StallSection";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronRight, Copy, ExternalLink, Percent, Plus, Store } from "lucide-react";
import type { DashboardMode } from "~~/hooks/useDashboardRealtime";
import type { Event, Stall } from "~~/lib/events.types";

interface DashboardControlsProps {
  mode: DashboardMode;
  events: Event[];
  operatorStalls: Stall[];
  onRefresh: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "paused":
      return "bg-warning/20 text-warning border-warning/30";
    case "ended":
      return "bg-base-content/10 text-base-content/50 border-base-content/20";
    default:
      return "bg-base-content/10 text-base-content/50 border-base-content/20";
  }
};

// Compact Operator Stall Card
const OperatorStallCardCompact = ({ stall }: { stall: Stall }) => {
  const [copied, setCopied] = useState(false);
  const event = stall.event as Event | undefined;
  const publicUrl = `/events/${event?.event_slug || ""}/${stall.stall_slug}`;

  const copyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-base-200/50 border border-emerald-500/10 p-3"
    >
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            stall.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-warning"
          }`}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-emerald-500/70" />
            <span className="font-medium text-sm text-base-content truncate">{stall.stall_name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <CalendarDays className="w-3 h-3 text-base-content/40" />
            <span className="text-[11px] text-base-content/50 truncate">{event?.event_name || "Unknown Event"}</span>
            <span className="text-base-content/30">·</span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-0.5">
              <Percent className="w-2.5 h-2.5" />
              {stall.split_percentage}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyUrl}
            className="p-2 rounded-lg bg-base-300/50 hover:bg-base-300 transition-colors"
          >
            {copied ? (
              <span className="text-[10px] text-emerald-400 font-medium px-1">Copied!</span>
            ) : (
              <Copy className="w-3.5 h-3.5 text-base-content/50" />
            )}
          </motion.button>
          <a
            href={publicUrl}
            onClick={e => e.stopPropagation()}
            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

// Operator Stalls List Section
const OperatorStallsSection = ({ stalls }: { stalls: Stall[] }) => {
  if (stalls.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">Stalls I Operate</span>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
            {stalls.length}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {stalls.map((stall, index) => (
          <motion.div
            key={stall.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <OperatorStallCardCompact stall={stall} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Events List Section
const EventsSection = ({
  events,
  onCreateEvent,
  onEditEvent,
  onRefresh,
}: {
  events: Event[];
  onCreateEvent: () => void;
  onEditEvent: (event: Event) => void;
  onRefresh: () => void;
}) => {
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);

  const toggleExpand = (eventId: number) => {
    setExpandedEventId(prev => (prev === eventId ? null : eventId));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">My Events</span>
          <span className="text-xs text-base-content/50 bg-base-300/50 px-2 py-0.5 rounded-full">{events.length}</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreateEvent}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Event
        </motion.button>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 px-4 rounded-2xl border border-dashed border-base-300"
        >
          <div className="w-12 h-12 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-6 h-6 text-base-content/30" />
          </div>
          <p className="text-sm text-base-content/50 mb-1">No events yet</p>
          <button onClick={onCreateEvent} className="text-xs text-primary font-medium hover:underline">
            Create your first event
          </button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {events.map((event, index) => {
            const isExpanded = expandedEventId === event.id;
            const stallCount = event.stalls?.length || 0;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-2xl overflow-hidden transition-all ${
                  event.status === "active"
                    ? "bg-gradient-to-br from-base-200/80 to-base-200/40 border border-primary/20"
                    : "bg-base-200/50 border border-transparent"
                }`}
              >
                {/* Event Header */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-base-300/20 transition-colors"
                  onClick={() => toggleExpand(event.id)}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {/* Status indicator */}
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        event.status === "active"
                          ? "bg-emerald-500 animate-pulse"
                          : event.status === "paused"
                            ? "bg-warning"
                            : "bg-base-content/20"
                      }`}
                    />

                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-base-content truncate">{event.event_name}</span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${getStatusColor(event.status)}`}
                        >
                          {event.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-base-content/50">
                        <span className="flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          {stallCount} {stallCount === 1 ? "stall" : "stalls"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 text-base-content/40 transition-transform flex-shrink-0 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>

                {/* Expanded Content - Stalls */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-base-300/50 overflow-hidden"
                    >
                      <StallSection
                        event={{ ...event, totalRevenue: 0 }}
                        onEditEvent={() => onEditEvent(event)}
                        onRefresh={onRefresh}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const DashboardControls = ({ mode, events, operatorStalls, onRefresh }: DashboardControlsProps) => {
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* ════════════════════════════════════════════════════════════════════
          ROLE-BASED ORDERING
          ════════════════════════════════════════════════════════════════════
          Operator Mode: Stalls I Operate → My Events
          Owner Mode:    My Events → Stalls I Operate (if any)
      ════════════════════════════════════════════════════════════════════ */}

      {mode === "operator" ? (
        <>
          {/* Operator sees their stalls first */}
          <OperatorStallsSection stalls={operatorStalls} />
          {/* Then events (secondary) */}
          <EventsSection
            events={events}
            onCreateEvent={handleCreateEvent}
            onEditEvent={handleEditEvent}
            onRefresh={onRefresh}
          />
        </>
      ) : (
        <>
          {/* Owner sees their events first */}
          <EventsSection
            events={events}
            onCreateEvent={handleCreateEvent}
            onEditEvent={handleEditEvent}
            onRefresh={onRefresh}
          />
          {/* Then operator stalls (if they happen to operate any) */}
          <OperatorStallsSection stalls={operatorStalls} />
        </>
      )}

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        onSuccess={handleModalSuccess}
        editingEvent={editingEvent}
      />
    </div>
  );
};

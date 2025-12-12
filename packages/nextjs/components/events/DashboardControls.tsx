"use client";

import { useState } from "react";
import { EventModal } from "./EventModal";
import { StallModal } from "./StallModal";
import { StallSection } from "./StallSection";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronRight, Copy, DollarSign, ExternalLink, Plus, Store } from "lucide-react";
import type { ActiveContext, DashboardMode, EventWithRevenue } from "~~/hooks/useDashboardRealtime";
import type { Event, Stall } from "~~/lib/events.types";

interface DashboardControlsProps {
  mode: DashboardMode;
  events: Event[];
  eventsWithRevenue: EventWithRevenue[];
  operatorStalls: Stall[];
  onRefresh: () => void;
  activeContext?: ActiveContext;
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
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
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

// Operator Stalls List Section (collapsible like EventsSection)
const OperatorStallsSection = ({ stalls, isCollapsible = true }: { stalls: Stall[]; isCollapsible?: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (stalls.length === 0) return null;

  return (
    <div>
      <div
        className={`flex items-center justify-between mb-3 px-1 ${isCollapsible ? "cursor-pointer" : ""}`}
        onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">Stalls I Operate</span>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
            {stalls.length}
          </span>
        </div>
        {isCollapsible && (
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4 text-base-content/40" />
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            initial={isCollapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={isCollapsible ? { height: 0, opacity: 0 } : undefined}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Format currency for inline display
const formatRevenue = (amount: number): string => {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
};

// Events List Section with Enhanced Cards (collapsible header)
const EventsSection = ({
  eventsWithRevenue,
  onCreateEvent,
  onEditEvent,
  onRefresh,
  onAddStall,
  isCollapsible = true,
}: {
  eventsWithRevenue: EventWithRevenue[];
  onCreateEvent: () => void;
  onEditEvent: (event: Event) => void;
  onRefresh: () => void;
  onAddStall: (event: Event) => void;
  isCollapsible?: boolean;
}) => {
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
  const [isSectionExpanded, setIsSectionExpanded] = useState(true);

  const toggleExpand = (eventId: number) => {
    setExpandedEventId(prev => (prev === eventId ? null : eventId));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div
          className={`flex items-center gap-2 ${isCollapsible ? "cursor-pointer" : ""}`}
          onClick={() => isCollapsible && setIsSectionExpanded(!isSectionExpanded)}
        >
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">My Events</span>
          <span className="text-xs text-base-content/50 bg-base-300/50 px-2 py-0.5 rounded-full">
            {eventsWithRevenue.length}
          </span>
          {isCollapsible && (
            <motion.div animate={{ rotate: isSectionExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="w-4 h-4 text-base-content/40" />
            </motion.div>
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={(e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            onCreateEvent();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 hover:bg-primary/25 text-primary rounded-full text-xs font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          New Event
        </motion.button>
      </div>

      {/* Events List */}
      <AnimatePresence mode="wait">
        {isSectionExpanded && (
          <motion.div
            initial={isCollapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={isCollapsible ? { height: 0, opacity: 0 } : undefined}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {eventsWithRevenue.length === 0 ? (
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
                {eventsWithRevenue.map((event, index) => {
                  const isExpanded = expandedEventId === event.id;
                  const stallCount = event.stalls?.length || 0;
                  const activeStalls = event.activeStallCount;

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
                      {/* Event Header - Enhanced */}
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-base-300/30 active:bg-base-300/40 transition-colors rounded-xl"
                        onClick={() => toggleExpand(event.id)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Status indicator */}
                          <div
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              event.status === "active"
                                ? "bg-emerald-500 animate-pulse"
                                : event.status === "paused"
                                  ? "bg-warning"
                                  : "bg-base-content/20"
                            }`}
                          />

                          {/* Event name */}
                          <span className="font-medium text-sm text-base-content truncate">{event.event_name}</span>

                          {/* Status badge */}
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border flex-shrink-0 ${getStatusColor(event.status)}`}
                          >
                            {event.status}
                          </span>
                        </div>

                        {/* Inline Stats */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Revenue */}
                          <span className="flex items-center gap-0.5 text-[11px] font-mono font-semibold text-warning">
                            <DollarSign className="w-3 h-3" />
                            {formatRevenue(event.calculatedRevenue).slice(1)}
                          </span>

                          {/* Divider */}
                          <span className="w-px h-3 bg-base-content/10" />

                          {/* Stalls ratio */}
                          <span className="text-[11px] text-base-content/50">
                            <span className={activeStalls > 0 ? "text-emerald-400 font-medium" : ""}>
                              {activeStalls}
                            </span>
                            /{stallCount}
                          </span>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1 ml-1">
                            {/* Add Stall */}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onAddStall(event);
                              }}
                              className="w-6 h-6 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3 h-3 text-primary" />
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
                      </div>

                      {/* Expanded Content - Stalls */}
                      <AnimatePresence mode="wait">
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-base-300/50 overflow-hidden"
                          >
                            <StallSection
                              event={{ ...event, totalRevenue: event.calculatedRevenue }}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DashboardControls = ({
  mode,
  events: _events,
  eventsWithRevenue,
  operatorStalls,
  onRefresh,
  activeContext,
}: DashboardControlsProps) => {
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isStallModalOpen, setIsStallModalOpen] = useState(false);
  const [stallTargetEvent, setStallTargetEvent] = useState<Event | null>(null);

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleAddStall = (event: Event) => {
    setStallTargetEvent(event);
    setIsStallModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
    onRefresh();
  };

  const handleStallModalSuccess = () => {
    setIsStallModalOpen(false);
    setStallTargetEvent(null);
    onRefresh();
  };

  // Determine effective context for ordering
  // Priority: activeContext (if set) > mode-based default > data-based fallback
  const effectiveContext = activeContext || (mode === "operator" ? "operator" : "owner");

  // Show operator stalls first if:
  // 1. User is in operator context, OR
  // 2. User has stalls but no events (regardless of context)
  const hasStallsOnly = operatorStalls.length > 0 && eventsWithRevenue.length === 0;
  const showOperatorFirst = effectiveContext === "operator" || hasStallsOnly;

  return (
    <div className="space-y-6">
      {/* ════════════════════════════════════════════════════════════════════
          CONTEXT-BASED ORDERING
          ════════════════════════════════════════════════════════════════════
          Operator Context: Stalls I Operate → My Events
          Owner Context:    My Events → Stalls I Operate (if any)
      ════════════════════════════════════════════════════════════════════ */}

      {showOperatorFirst ? (
        <>
          {/* Operator sees their stalls first */}
          <OperatorStallsSection stalls={operatorStalls} />
          {/* Then events (secondary) */}
          <EventsSection
            eventsWithRevenue={eventsWithRevenue}
            onCreateEvent={handleCreateEvent}
            onEditEvent={handleEditEvent}
            onRefresh={onRefresh}
            onAddStall={handleAddStall}
          />
        </>
      ) : (
        <>
          {/* Owner sees their events first */}
          <EventsSection
            eventsWithRevenue={eventsWithRevenue}
            onCreateEvent={handleCreateEvent}
            onEditEvent={handleEditEvent}
            onRefresh={onRefresh}
            onAddStall={handleAddStall}
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

      {/* Stall Modal for Quick Add */}
      {stallTargetEvent && (
        <StallModal
          isOpen={isStallModalOpen}
          onClose={() => {
            setIsStallModalOpen(false);
            setStallTargetEvent(null);
          }}
          onSuccess={handleStallModalSuccess}
          eventId={stallTargetEvent.id}
          eventSlug={stallTargetEvent.event_slug}
          editingStall={null}
        />
      )}
    </div>
  );
};

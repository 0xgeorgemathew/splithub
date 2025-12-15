"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ExternalLink, Radio, Store, User } from "lucide-react";
import type { Event, Stall } from "~~/lib/events.types";
import { supabase } from "~~/lib/supabase";

// Extended stall type with event data
type PublicStall = Stall & {
  event: Event;
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

// Individual stall card - matches existing card styling
const PublicStallCard = ({ stall, index }: { stall: PublicStall; index: number }) => {
  const publicUrl = `/events/${stall.event.event_slug}/${stall.stall_slug}`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Link href={publicUrl}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="rounded-2xl p-4 relative overflow-hidden border border-emerald-500/10 bg-gradient-to-br from-base-200/80 to-base-200/40 cursor-pointer hover:border-emerald-500/30 transition-colors"
        >
          {/* Active indicator glow */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(at 20% 30%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
            }}
          />

          <div className="relative">
            {/* Top row: Event badge + Live indicator */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
                <CalendarDays className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider truncate max-w-[120px]">
                  {stall.event.event_name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
              </div>
            </div>

            {/* Stall info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base-content truncate">{stall.stall_name}</h3>
                {stall.operator_user && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {stall.operator_user.twitter_profile_url ? (
                      <Image
                        src={stall.operator_user.twitter_profile_url}
                        alt={stall.operator_twitter_handle}
                        width={14}
                        height={14}
                        className="w-3.5 h-3.5 rounded-full"
                      />
                    ) : (
                      <User className="w-3 h-3 text-base-content/40" />
                    )}
                    <span className="text-xs text-base-content/50">@{stall.operator_twitter_handle}</span>
                  </div>
                )}
              </div>
              <ExternalLink className="w-4 h-4 text-base-content/30 flex-shrink-0" />
            </div>

            {/* Updated timestamp */}
            {stall.updated_at && (
              <div className="mt-3 pt-3 border-t border-base-300/30">
                <span className="text-[10px] text-base-content/40">Updated {formatTimeAgo(stall.updated_at)}</span>
              </div>
            )}
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
};

export const PublicStallsSection = () => {
  const [stalls, setStalls] = useState<PublicStall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicStalls = async () => {
      try {
        // Fetch active stalls from active events
        const { data, error } = await supabase
          .from("stalls")
          .select(
            `
            *,
            event:events!event_id(*),
            operator_user:users!operator_wallet(name, twitter_handle, twitter_profile_url)
          `,
          )
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        // Filter to only stalls from active events
        const activeStalls = (data || []).filter(
          (stall: PublicStall) => stall.event?.status === "active",
        ) as PublicStall[];

        setStalls(activeStalls);
      } catch (err) {
        console.error("Error fetching public stalls:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicStalls();

    // Subscribe to stall changes for live updates
    const channel = supabase
      .channel("public_stalls")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stalls",
        },
        () => fetchPublicStalls(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Radio className="w-4 h-4 text-emerald-500/50" />
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-base-content/50 text-sm mt-4 font-medium"
        >
          Finding active stalls...
        </motion.p>
      </motion.div>
    );
  }

  // No active stalls
  if (stalls.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center py-16 px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          className="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mx-auto mb-4"
        >
          <Store className="w-8 h-8 text-base-content/30" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-base-content/50 text-sm"
        >
          No active stalls at the moment
        </motion.p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">Active Stalls</span>
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {stalls.length} live
          </span>
        </div>
      </div>

      {/* Stalls Grid */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {stalls.map((stall, index) => (
            <PublicStallCard key={stall.id} stall={stall} index={index} />
          ))}
        </div>
      </AnimatePresence>
    </motion.div>
  );
};

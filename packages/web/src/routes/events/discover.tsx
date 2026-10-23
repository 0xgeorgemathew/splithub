import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { PublicStallsSection } from "~~/components/events/PublicStallsSection";

function DiscoverStallsPage() {
  return (
    <div className="px-4 py-4 pb-24">
      {/* Back navigation */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-4">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs text-base-content/50 hover:text-base-content/70 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Events
        </Link>
      </motion.div>

      {/* Active Stalls */}
      <PublicStallsSection />
    </div>
  );
}

export const Route = createFileRoute("/events/discover")({
  component: DiscoverStallsPage,
});

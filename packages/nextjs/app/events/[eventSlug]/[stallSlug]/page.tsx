import { notFound } from "next/navigation";
import { StallTerminal } from "~~/components/stall/StallTerminal";
import { getEventBySlug, getStallBySlug } from "~~/services/eventsService";

interface StallPageProps {
  params: Promise<{
    eventSlug: string;
    stallSlug: string;
  }>;
}

export default async function StallPage({ params }: StallPageProps) {
  const { eventSlug, stallSlug } = await params;

  // Fetch event and stall data
  const event = await getEventBySlug(eventSlug);
  if (!event) {
    notFound();
  }

  const stall = await getStallBySlug(eventSlug, stallSlug);
  if (!stall) {
    notFound();
  }

  // Only show active stalls at active events
  if (event.status !== "active" || stall.status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Stall Unavailable</h1>
          <p className="text-zinc-400">
            {event.status !== "active"
              ? "This event is not currently active."
              : "This stall is not currently accepting payments."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-zinc-950 text-zinc-100 selection:bg-amber-500/30">
      {/* BACKGROUND LAYER START */}

      {/* 1. Deep Background with Spotlight Center - lighter in middle for "studio" effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/50 via-zinc-950/80 to-zinc-950 z-0" />

      {/* 2. The "SplitHub" Warm Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[100px] opacity-70 z-0" />

      {/* 3. Grid/Dot Pattern (Fades out at edges) */}
      <div
        className="absolute inset-0 z-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(#fbbf24 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(circle at center, black 40%, transparent 100%)",
        }}
      />

      {/* BACKGROUND LAYER END */}

      {/* FOREGROUND CONTENT */}
      {/* DESIGN FIX: Added p-6 (24px padding) on all sides for mobile.
          This creates the necessary breathing room so the terminal doesn't touch the screen edges.
      */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-6 md:py-4">
        {/* Terminal Wrapper
            - max-w-[400px]: Maximum width for larger screens
            - max-h-[80dvh]: Prevents terminal from being too tall
            - aspect-[9/19.5]: Maintains the phone shape - this drives the sizing
            - The aspect ratio ensures consistent proportions regardless of content
        */}
        <div className="relative w-full max-w-[400px] max-h-[80dvh] aspect-[9/19.5] mx-auto">
          <StallTerminal stall={stall} event={event} />
        </div>

        {/* Footer Branding */}
        <div className="mt-6 text-center opacity-40 hover:opacity-100 transition-opacity">
          <span className="text-xs font-mono tracking-widest text-amber-500/80">POWERED BY SPLITHUB</span>
        </div>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: StallPageProps) {
  const { eventSlug, stallSlug } = await params;

  const event = await getEventBySlug(eventSlug);
  if (!event) {
    return { title: "Stall Not Found" };
  }

  const stall = await getStallBySlug(eventSlug, stallSlug);
  if (!stall) {
    return { title: "Stall Not Found" };
  }

  return {
    title: `${stall.stall_name} | ${event.event_name} | SplitHub`,
    description: `Pay at ${stall.stall_name} during ${event.event_name}`,
  };
}

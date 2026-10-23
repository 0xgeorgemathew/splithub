import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CreateVenueModal } from "./CreateVenueModal";
import { usePrivy } from "@privy-io/react-auth";
import { Coins, MapPin, Plus, Store, Ticket } from "lucide-react";
import type { Venue } from "~~/lib/venue.types";
import { listPublicVenues, listVenuesByOwner } from "~~/services/venueService";

function VenueCard({ venue }: { venue: Venue }) {
  const stalls = venue.venue_stalls ?? [];
  return (
    <Link
      to="/venues/$venueSlug"
      params={{ venueSlug: venue.venue_slug }}
      className="block rounded-3xl border border-white/10 bg-gradient-to-br from-base-200/80 to-base-300/60 p-5 shadow-xl transition hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-primary/70">
            {venue.chain_venue_id ? (venue.status === "active" ? "Open" : "Closed") : "Not taking credits yet"}
          </p>
          <h3 className="mt-2 text-xl font-bold text-base-content">{venue.venue_name}</h3>
          <p className="mt-1 text-sm text-base-content/60">{venue.venue_description || "Closed-loop venue credits"}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-base-content/60">
        {stalls.slice(0, 4).map(stall => (
          <span key={stall.id} className="rounded-full bg-base-100/70 px-3 py-1">
            {stall.stall_name}
            {stall.credit_price ? ` · ${stall.credit_price} CR` : ""}
          </span>
        ))}
        {stalls.length === 0 && <span className="rounded-full bg-base-100/70 px-3 py-1">No stalls yet</span>}
      </div>
    </Link>
  );
}

export function VenuesHub() {
  const { ready, authenticated, user, login } = usePrivy();
  const wallet = authenticated ? user?.wallet?.address?.toLowerCase() : undefined;
  const [publicVenues, setPublicVenues] = useState<Venue[]>([]);
  const [myVenues, setMyVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listPublicVenues(), wallet ? listVenuesByOwner(wallet) : Promise.resolve([])])
      .then(([all, mine]) => {
        if (cancelled) return;
        setPublicVenues(all);
        setMyVenues(mine);
      })
      .catch(err => !cancelled && setError(err instanceof Error ? err.message : "Failed to load venues"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const myIds = new Set(myVenues.map(venue => venue.id));
  const browse = publicVenues.filter(venue => !myIds.has(venue.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 pb-24 md:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_35%),linear-gradient(145deg,#171717_0%,#0b0b0b_100%)] p-6 shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              <Ticket className="h-3.5 w-3.5" />
              Closed-loop venues
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white">Credits that work at your venue</h1>
            <p className="mt-3 max-w-xl text-base text-white/70">
              Arcades, festivals, resorts: guests top up your venue&apos;s credits with USDC, then tap their chip to
              spend them at your stalls. Credits stay inside your venue, and you withdraw what guests spend.
            </p>
          </div>
          {ready &&
            (authenticated ? (
              <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Set up a venue
              </button>
            ) : (
              <button className="btn btn-primary" onClick={login}>
                Sign in to set up a venue
              </button>
            ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: Coins, title: "Top up", text: "1 USDC buys 10 credits, paid from the guest's wallet with a tap." },
            { icon: Store, title: "Spend", text: "Each stall takes credits at its price. Two taps on the terminal." },
            {
              icon: MapPin,
              title: "Closed loop",
              text: "Credits only work at the venue. Unspent credits can be refunded.",
            },
          ].map(step => (
            <div key={step.title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <step.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-bold text-white">{step.title}</div>
              <div className="text-sm text-white/60">{step.text}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {loading ? (
        <div className="mt-8 text-sm text-base-content/50">Loading venues…</div>
      ) : (
        <>
          {wallet && (
            <section className="mt-8">
              <h2 className="mb-4 text-lg font-bold">Your venues</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {myVenues.length ? (
                  myVenues.map(venue => <VenueCard key={venue.id} venue={venue} />)
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-base-200/40 p-6 text-sm text-base-content/55">
                    You haven&apos;t set up a venue yet. Create one, add stalls with credit prices, and open the top-up
                    terminal.
                  </div>
                )}
              </div>
            </section>
          )}
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-bold">Open venues</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {browse.length ? (
                browse.map(venue => <VenueCard key={venue.id} venue={venue} />)
              ) : (
                <div className="text-sm text-base-content/50">No other venues are open right now.</div>
              )}
            </div>
          </section>
        </>
      )}

      <CreateVenueModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}

import { createFileRoute, notFound } from "@tanstack/react-router";
import { loadVenue } from "./index";
import { TerminalShell, TerminalUnavailable } from "~~/components/venues/terminal/TerminalShell";
import { VenueTerminal } from "~~/components/venues/terminal/VenueTerminal";
import { seo } from "~~/utils/seo";

export const Route = createFileRoute("/venues/$venueSlug/$stallSlug")({
  loader: async ({ params }) => {
    const venue = await loadVenue({ data: { venueSlug: params.venueSlug } });
    const stall = venue?.venue_stalls?.find(s => s.stall_slug === params.stallSlug);
    if (!venue || !stall) throw notFound();
    return { venue, stall };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? seo({
          title: `${loaderData.stall.stall_name} | ${loaderData.venue.venue_name} | SplitHub`,
          description: `Pay with ${loaderData.venue.venue_name} credits at ${loaderData.stall.stall_name}`,
        })
      : [],
  }),
  component: StallTerminalPage,
});

function StallTerminalPage() {
  const { venue, stall } = Route.useLoaderData();
  if (!venue.chain_venue_id || venue.status !== "active" || stall.status !== "active") {
    return (
      <TerminalUnavailable
        title="Stall unavailable"
        message={
          venue.status !== "active" || !venue.chain_venue_id
            ? `${venue.venue_name} is not taking credits right now.`
            : "This stall is not taking payments right now."
        }
      />
    );
  }
  return (
    <TerminalShell>
      <VenueTerminal venue={{ ...venue, chain_venue_id: venue.chain_venue_id }} mode={{ kind: "spend", stall }} />
    </TerminalShell>
  );
}

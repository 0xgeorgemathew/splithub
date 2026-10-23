import { createFileRoute, notFound } from "@tanstack/react-router";
import { loadVenue } from "./index";
import { TerminalShell, TerminalUnavailable } from "~~/components/venues/terminal/TerminalShell";
import { VenueTerminal } from "~~/components/venues/terminal/VenueTerminal";
import { seo } from "~~/utils/seo";

export const Route = createFileRoute("/venues/$venueSlug/topup")({
  loader: async ({ params }) => {
    const venue = await loadVenue({ data: { venueSlug: params.venueSlug } });
    if (!venue) throw notFound();
    return venue;
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? seo({ title: `Top up | ${loaderData.venue_name} | SplitHub` }) : [],
  }),
  component: TopUpTerminalPage,
});

function TopUpTerminalPage() {
  const venue = Route.useLoaderData();
  if (!venue.chain_venue_id || venue.status !== "active") {
    return (
      <TerminalUnavailable
        title="Top-ups unavailable"
        message={`${venue.venue_name} is not taking credits right now.`}
      />
    );
  }
  return (
    <TerminalShell>
      <VenueTerminal venue={{ ...venue, chain_venue_id: venue.chain_venue_id }} mode={{ kind: "topup" }} />
    </TerminalShell>
  );
}

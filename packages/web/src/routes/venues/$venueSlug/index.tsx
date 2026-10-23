import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { VenuePage } from "~~/components/venues/VenuePage";
import { getVenueBySlug } from "~~/services/venueService";
import { seo } from "~~/utils/seo";

export const loadVenue = createServerFn({ method: "GET" })
  .validator((data: { venueSlug: string }) => data)
  .handler(async ({ data }) => getVenueBySlug(data.venueSlug));

export const Route = createFileRoute("/venues/$venueSlug/")({
  loader: async ({ params }) => {
    const venue = await loadVenue({ data: { venueSlug: params.venueSlug } });
    if (!venue) throw notFound();
    return venue;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? seo({
          title: `${loaderData.venue_name} | SplitHub`,
          description: loaderData.venue_description || `Top up and spend credits at ${loaderData.venue_name}`,
        })
      : [],
  }),
  component: VenueRoute,
});

function VenueRoute() {
  const venue = Route.useLoaderData();
  return <VenuePage key={venue.id} venue={venue} />;
}

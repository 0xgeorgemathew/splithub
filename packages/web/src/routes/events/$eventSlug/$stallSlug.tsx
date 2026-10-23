import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old stall terminal URLs; venue and stall slugs carried over to /venues. */
export const Route = createFileRoute("/events/$eventSlug/$stallSlug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/venues/$venueSlug/$stallSlug",
      params: { venueSlug: params.eventSlug, stallSlug: params.stallSlug },
      statusCode: 301,
    });
  },
});

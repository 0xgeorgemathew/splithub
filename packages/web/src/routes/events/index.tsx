import { createFileRoute, redirect } from "@tanstack/react-router";

/** Venues used to live at /events. */
export const Route = createFileRoute("/events/")({
  beforeLoad: () => {
    throw redirect({ to: "/venues", statusCode: 301 });
  },
});

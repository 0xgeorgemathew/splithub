import { createFileRoute, redirect } from "@tanstack/react-router";

/** Credits are per venue now; buy and spend them on the venue's page. */
export const Route = createFileRoute("/credits")({
  beforeLoad: () => {
    throw redirect({ to: "/venues", statusCode: 301 });
  },
});

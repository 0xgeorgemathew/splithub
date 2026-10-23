import { createFileRoute } from "@tanstack/react-router";
import { VenuesHub } from "~~/components/venues/VenuesHub";
import { seo } from "~~/utils/seo";

export const Route = createFileRoute("/venues/")({
  head: () => ({
    meta: seo({
      title: "Venues | SplitHub",
      description: "Closed-loop venue credits: top up with USDC, spend at the venue's stalls with a chip tap.",
    }),
  }),
  component: VenuesHub,
});

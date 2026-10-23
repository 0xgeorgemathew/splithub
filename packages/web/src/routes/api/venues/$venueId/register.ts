import { createFileRoute } from "@tanstack/react-router";
import { errorResponse } from "~~/lib/auth";
import { supabase } from "~~/lib/supabase";
import { readCreatedChainVenue, requireVenueOwner } from "~~/services/venueAccess";

/** Links a venue created before VenueCredits to the on-chain venue its owner just registered. */
async function POST(request: Request, venueId: number) {
  try {
    const { wallet, venue } = await requireVenueOwner(request, venueId);
    if (venue.chain_venue_id) return Response.json({ error: "This venue already takes credits" }, { status: 409 });

    const { txHash } = (await request.json()) as { txHash?: string };
    const chainVenueId = await readCreatedChainVenue(txHash, wallet);
    const { data, error } = await supabase
      .from("venues")
      .update({ chain_venue_id: chainVenueId })
      .eq("id", venueId)
      .select("*")
      .single();
    if (error) throw new Error(error.code === "23505" ? "That on-chain venue is already linked" : error.message);
    return Response.json({ venue: data });
  } catch (error) {
    return errorResponse(error, "Failed to register venue");
  }
}

export const Route = createFileRoute("/api/venues/$venueId/register")({
  server: { handlers: { POST: ({ request, params }) => POST(request, Number(params.venueId)) } },
});

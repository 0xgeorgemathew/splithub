import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, requireUser } from "~~/lib/auth";
import { supabase } from "~~/lib/supabase";
import { readCreatedChainVenue } from "~~/services/venueAccess";
import { uniqueSlug } from "~~/services/venueService";

/**
 * Creates a venue owned by the signed-in user. The client first registers the venue on VenueCredits from
 * the owner's wallet; the venue id is read from that transaction, never taken from the request.
 */
async function POST(request: Request) {
  try {
    const { wallet } = await requireUser(request);
    const body = (await request.json()) as { name?: string; description?: string; txHash?: string };
    const name = body.name?.trim();
    if (!name) return Response.json({ error: "Venue name is required" }, { status: 400 });

    const chainVenueId = await readCreatedChainVenue(body.txHash, wallet);

    const base = uniqueSlug(name, []);
    const { data: taken } = await supabase.from("venues").select("venue_slug").like("venue_slug", `${base}%`);
    const { data: venue, error } = await supabase
      .from("venues")
      .insert({
        venue_name: name,
        venue_slug: uniqueSlug(
          name,
          (taken ?? []).map(row => row.venue_slug),
        ),
        venue_description: body.description?.trim() || null,
        owner_wallet: wallet,
        chain_venue_id: chainVenueId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.code === "23505" ? "This venue is already registered" : error.message);

    return Response.json({ venue }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create venue");
  }
}

export const Route = createFileRoute("/api/venues/create")({
  server: { handlers: { POST: ({ request }) => POST(request) } },
});

import { createFileRoute } from "@tanstack/react-router";
import { errorResponse } from "~~/lib/auth";
import { supabase } from "~~/lib/supabase";
import { requireVenueOwner } from "~~/services/venueAccess";

/** Updates a venue's name, description or listing status (owner only). */
async function PATCH(request: Request, venueId: number) {
  try {
    await requireVenueOwner(request, venueId);
    const body = (await request.json()) as { venue_name?: string; venue_description?: string; status?: string };
    const updates: Record<string, unknown> = {};
    if (body.venue_name !== undefined) {
      if (!body.venue_name.trim()) return Response.json({ error: "Venue name is required" }, { status: 400 });
      updates.venue_name = body.venue_name.trim();
    }
    if (body.venue_description !== undefined) updates.venue_description = body.venue_description.trim() || null;
    if (body.status !== undefined) {
      if (!["active", "paused"].includes(body.status))
        return Response.json({ error: "Invalid status" }, { status: 400 });
      updates.status = body.status;
    }
    const { data: venue, error } = await supabase.from("venues").update(updates).eq("id", venueId).select("*").single();
    if (error) throw new Error(error.message);
    return Response.json({ venue });
  } catch (error) {
    return errorResponse(error, "Failed to update venue");
  }
}

/** Deletes a venue, its stalls and its activity log (owner only). Credits on-chain are unaffected. */
async function DELETE(request: Request, venueId: number) {
  try {
    await requireVenueOwner(request, venueId);
    const { error } = await supabase.from("venues").delete().eq("id", venueId);
    if (error) throw new Error(error.message);
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete venue");
  }
}

export const Route = createFileRoute("/api/venues/$venueId/")({
  server: {
    handlers: {
      PATCH: ({ request, params }) => PATCH(request, Number(params.venueId)),
      DELETE: ({ request, params }) => DELETE(request, Number(params.venueId)),
    },
  },
});

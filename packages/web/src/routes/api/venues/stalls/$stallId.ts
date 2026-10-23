import { createFileRoute } from "@tanstack/react-router";
import { AuthError, errorResponse } from "~~/lib/auth";
import { supabase } from "~~/lib/supabase";
import { requireVenueOwner } from "~~/services/venueAccess";
import { getStallWithVenue, parseCreditPrice } from "~~/services/venueService";

async function requireOwnedStall(request: Request, stallId: number) {
  const stall = await getStallWithVenue(stallId);
  if (!stall) throw new AuthError("Stall not found", 403);
  await requireVenueOwner(request, stall.venue_id);
  return stall;
}

/** Updates a stall's name, description, credit price or status (venue owner only). */
async function PATCH(request: Request, stallId: number) {
  try {
    await requireOwnedStall(request, stallId);
    const body = (await request.json()) as {
      stall_name?: string;
      stall_description?: string;
      credit_price?: unknown;
      status?: string;
    };
    const updates: Record<string, unknown> = {};
    if (body.stall_name !== undefined) {
      if (!body.stall_name.trim()) return Response.json({ error: "Stall name is required" }, { status: 400 });
      updates.stall_name = body.stall_name.trim();
    }
    if (body.stall_description !== undefined) updates.stall_description = body.stall_description.trim() || null;
    if (body.credit_price !== undefined) updates.credit_price = parseCreditPrice(body.credit_price);
    if (body.status !== undefined) {
      if (!["active", "paused"].includes(body.status))
        return Response.json({ error: "Invalid status" }, { status: 400 });
      updates.status = body.status;
    }
    const { data: stall, error } = await supabase
      .from("venue_stalls")
      .update(updates)
      .eq("id", stallId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return Response.json({ stall });
  } catch (error) {
    return errorResponse(error, "Failed to update stall");
  }
}

/** Removes a stall (venue owner only); its past activity stays in the venue log. */
async function DELETE(request: Request, stallId: number) {
  try {
    await requireOwnedStall(request, stallId);
    const { error } = await supabase.from("venue_stalls").delete().eq("id", stallId);
    if (error) throw new Error(error.message);
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete stall");
  }
}

export const Route = createFileRoute("/api/venues/stalls/$stallId")({
  server: {
    handlers: {
      PATCH: ({ request, params }) => PATCH(request, Number(params.stallId)),
      DELETE: ({ request, params }) => DELETE(request, Number(params.stallId)),
    },
  },
});

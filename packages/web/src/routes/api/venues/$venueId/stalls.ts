import { createFileRoute } from "@tanstack/react-router";
import { errorResponse } from "~~/lib/auth";
import { supabase } from "~~/lib/supabase";
import { requireVenueOwner } from "~~/services/venueAccess";
import { InvalidInputError, parseCreditPrice, uniqueSlug } from "~~/services/venueService";

/** Adds a stall to the venue (owner only). */
async function POST(request: Request, venueId: number) {
  try {
    await requireVenueOwner(request, venueId);
    const body = (await request.json()) as { stall_name?: string; stall_description?: string; credit_price?: unknown };
    const name = body.stall_name?.trim();
    if (!name) return Response.json({ error: "Stall name is required" }, { status: 400 });

    const { data: existing } = await supabase.from("venue_stalls").select("stall_slug").eq("venue_id", venueId);
    const { data: stall, error } = await supabase
      .from("venue_stalls")
      .insert({
        venue_id: venueId,
        stall_name: name,
        stall_slug: uniqueSlug(
          name,
          (existing ?? []).map(row => row.stall_slug),
        ),
        stall_description: body.stall_description?.trim() || null,
        credit_price: parseCreditPrice(body.credit_price),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return Response.json({ stall }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidInputError) return Response.json({ error: error.message }, { status: 400 });
    return errorResponse(error, "Failed to add stall");
  }
}

export const Route = createFileRoute("/api/venues/$venueId/stalls")({
  server: { handlers: { POST: ({ request, params }) => POST(request, Number(params.venueId)) } },
});

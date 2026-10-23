import { createFileRoute } from "@tanstack/react-router";
import { AuthError, errorResponse, requireUser, sameWallet } from "~~/lib/auth";
import type { Event } from "~~/lib/events.types";
import { deleteEvent, getEventById, updateEvent } from "~~/services/eventsService";

const EDITABLE = ["event_name", "event_slug", "event_description", "status", "start_date", "end_date"] as const;

async function requireOwnedVenue(request: Request, eventId: number) {
  const { wallet } = await requireUser(request);
  const event = await getEventById(eventId);
  if (!event) throw new AuthError("Venue not found", 403);
  if (!sameWallet(event.owner_wallet, wallet)) throw new AuthError("Only the venue owner can change it", 403);
  return event;
}

/** Updates a venue's details or status (owner only). */
async function PATCH(request: Request, eventId: number) {
  try {
    await requireOwnedVenue(request, eventId);
    const body = (await request.json()) as Partial<Event>;
    const updates: Partial<Event> = {};
    for (const key of EDITABLE) {
      if (body[key] !== undefined) (updates as Record<string, unknown>)[key] = body[key] === "" ? null : body[key];
    }
    if (updates.status && !["active", "paused", "ended"].includes(updates.status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    const event = await updateEvent(eventId, updates);
    return Response.json({ event });
  } catch (error) {
    return errorResponse(error, "Failed to update venue");
  }
}

/** Deletes a venue and its stalls (owner only). */
async function DELETE(request: Request, eventId: number) {
  try {
    await requireOwnedVenue(request, eventId);
    await deleteEvent(eventId);
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete venue");
  }
}

export const Route = createFileRoute("/api/events/$eventId")({
  server: {
    handlers: {
      PUT: ({ request, params }) => PATCH(request, Number(params.eventId)),
      PATCH: ({ request, params }) => PATCH(request, Number(params.eventId)),
      DELETE: ({ request, params }) => DELETE(request, Number(params.eventId)),
    },
  },
});

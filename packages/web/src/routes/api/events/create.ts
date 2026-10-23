import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, requireUser } from "~~/lib/auth";
import type { CreateEventData } from "~~/lib/events.types";
import { createEvent } from "~~/services/eventsService";

/** Creates a venue owned by the signed-in user. */
async function POST(request: Request) {
  try {
    const { wallet } = await requireUser(request);
    const body: Partial<CreateEventData> = await request.json();

    if (!body.event_name?.trim() || !body.event_slug?.trim()) {
      return Response.json({ error: "Venue name and URL slug are required" }, { status: 400 });
    }

    const event = await createEvent({
      event_name: body.event_name.trim(),
      event_slug: body.event_slug.trim(),
      event_description: body.event_description,
      start_date: body.start_date,
      end_date: body.end_date,
      owner_wallet: wallet,
    });

    return Response.json({ event }, { status: 201 });
  } catch (error: unknown) {
    return errorResponse(error, "Failed to create venue");
  }
}

export const Route = createFileRoute("/api/events/create")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import type { CreateEventData } from "~~/lib/events.types";
import { createEvent } from "~~/services/eventsService";

async function POST(request: Request) {
  try {
    const body: CreateEventData = await request.json();

    // Validation
    if (!body.event_name || !body.event_slug || !body.owner_wallet) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create event
    const event = await createEvent(body);

    return Response.json({ event }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create event error:", error);
    const message = error instanceof Error ? error.message : "Failed to create event";
    return Response.json({ error: message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/events/create")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

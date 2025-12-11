import { NextRequest, NextResponse } from "next/server";
import type { CreateEventData } from "~~/lib/events.types";
import { createEvent } from "~~/services/eventsService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body: CreateEventData = await request.json();

    // Validation
    if (!body.event_name || !body.event_slug || !body.owner_wallet) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create event
    const event = await createEvent(body);

    return NextResponse.json({ event }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create event error:", error);
    const message = error instanceof Error ? error.message : "Failed to create event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { createFileRoute } from "@tanstack/react-router";
import { TOKENS } from "~~/config/tokens";
import { errorResponse, requireUser, sameWallet } from "~~/lib/auth";
import type { CreateStallData } from "~~/lib/events.types";
import { createStall, getEventById } from "~~/services/eventsService";

/** Adds a stall to one of the signed-in user's venues. */
async function POST(request: Request) {
  try {
    const { wallet } = await requireUser(request);
    const body: Partial<CreateStallData> = await request.json();

    if (!body.event_id || !body.stall_name?.trim() || !body.stall_slug?.trim() || !body.operator_twitter_handle) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const event = await getEventById(body.event_id);
    if (!event || event.kind !== "venue") {
      return Response.json({ error: "Venue not found" }, { status: 404 });
    }
    if (!sameWallet(event.owner_wallet, wallet)) {
      return Response.json({ error: "Only the venue owner can add stalls" }, { status: 403 });
    }

    const split = Number(body.split_percentage ?? 100);
    if (!Number.isFinite(split) || split < 0 || split > 100) {
      return Response.json({ error: "Operator share must be between 0 and 100" }, { status: 400 });
    }

    const stall = await createStall({
      event_id: event.id,
      stall_name: body.stall_name.trim(),
      stall_slug: body.stall_slug.trim(),
      stall_description: body.stall_description,
      operator_twitter_handle: body.operator_twitter_handle,
      split_percentage: split,
      token_address: TOKENS.USDC,
    });

    return Response.json({ stall }, { status: 201 });
  } catch (error: unknown) {
    return errorResponse(error, "Failed to create stall");
  }
}

export const Route = createFileRoute("/api/events/stalls/create")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

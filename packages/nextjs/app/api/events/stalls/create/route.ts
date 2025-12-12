import { NextRequest, NextResponse } from "next/server";
import type { CreateStallData } from "~~/lib/events.types";
import { createStall } from "~~/services/eventsService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body: CreateStallData = await request.json();

    // Validation
    if (
      !body.event_id ||
      !body.stall_name ||
      !body.stall_slug ||
      !body.operator_twitter_handle ||
      !body.token_address
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Default split_percentage to 100 (operator gets all)
    const stallData: CreateStallData = {
      ...body,
      split_percentage: 100,
    };

    // Create stall
    const stall = await createStall(stallData);

    return NextResponse.json({ stall }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create stall error:", error);
    const message = error instanceof Error ? error.message : "Failed to create stall";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

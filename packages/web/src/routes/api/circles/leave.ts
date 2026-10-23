import { createFileRoute } from "@tanstack/react-router";
import { isAddress } from "viem";
import { leaveCircle } from "~~/services/circleService";

// POST /api/circles/leave - Leave a circle
async function POST(request: Request) {
  try {
    const body = await request.json();
    const { circleId, memberWallet } = body;

    // Validate required fields
    if (!circleId || !memberWallet) {
      return Response.json({ error: "Missing required fields: circleId, memberWallet" }, { status: 400 });
    }

    // Validate wallet address
    if (!isAddress(memberWallet)) {
      return Response.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    // Leave the circle
    await leaveCircle(circleId, memberWallet);

    return Response.json({
      success: true,
      message: "Successfully left the circle",
    });
  } catch (err) {
    console.error("Leave circle error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to leave circle" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/circles/leave")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

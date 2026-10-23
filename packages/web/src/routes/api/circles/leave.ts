import { createFileRoute } from "@tanstack/react-router";
import { isAddress } from "viem";
import { errorResponse, requireUser, sameWallet } from "~~/lib/auth";
import { leaveCircle } from "~~/services/circleService";

// POST /api/circles/leave - Leave a circle
async function POST(request: Request) {
  try {
    const { wallet } = await requireUser(request);
    const body = await request.json();
    const { circleId, memberWallet = wallet } = body;

    // Validate required fields
    if (!circleId || !memberWallet) {
      return Response.json({ error: "Missing required fields: circleId, memberWallet" }, { status: 400 });
    }

    // Validate wallet address
    if (!isAddress(memberWallet)) {
      return Response.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    if (!sameWallet(memberWallet, wallet)) {
      return Response.json({ error: "You can only leave circles yourself" }, { status: 403 });
    }

    // Leave the circle
    await leaveCircle(circleId, memberWallet);

    return Response.json({
      success: true,
      message: "Successfully left the circle",
    });
  } catch (err) {
    return errorResponse(err, "Failed to leave circle");
  }
}

export const Route = createFileRoute("/api/circles/leave")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

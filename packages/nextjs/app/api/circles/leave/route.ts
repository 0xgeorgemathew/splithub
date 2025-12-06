import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { leaveCircle } from "~~/services/circleService";

// POST /api/circles/leave - Leave a circle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { circleId, memberWallet } = body;

    // Validate required fields
    if (!circleId || !memberWallet) {
      return NextResponse.json({ error: "Missing required fields: circleId, memberWallet" }, { status: 400 });
    }

    // Validate wallet address
    if (!isAddress(memberWallet)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    // Leave the circle
    await leaveCircle(circleId, memberWallet);

    return NextResponse.json({
      success: true,
      message: "Successfully left the circle",
    });
  } catch (err) {
    console.error("Leave circle error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to leave circle" }, { status: 500 });
  }
}

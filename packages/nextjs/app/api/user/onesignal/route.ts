import { NextResponse } from "next/server";
import { updateOneSignalPlayerId } from "~~/services/userService";

export async function POST(request: Request) {
  try {
    const { walletAddress, playerId } = await request.json();

    if (!walletAddress || !playerId) {
      return NextResponse.json({ error: "Missing walletAddress or playerId" }, { status: 400 });
    }

    await updateOneSignalPlayerId(walletAddress, playerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save OneSignal player ID:", error);
    return NextResponse.json({ error: "Failed to save player ID" }, { status: 500 });
  }
}

// Clear subscription ID (for debugging stale subscriptions)
export async function DELETE(request: Request) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    // Set to null to clear the subscription
    await updateOneSignalPlayerId(walletAddress, null);

    return NextResponse.json({ success: true, message: "Subscription ID cleared" });
  } catch (error) {
    console.error("Failed to clear OneSignal player ID:", error);
    return NextResponse.json({ error: "Failed to clear player ID" }, { status: 500 });
  }
}

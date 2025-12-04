import { NextRequest, NextResponse } from "next/server";
import { syncPrivyUser } from "~~/services/userService";

// POST /api/user/sync - Sync Privy user to Supabase
export async function POST(request: NextRequest) {
  try {
    const privyUser = await request.json();

    if (!privyUser || !privyUser.id) {
      return NextResponse.json({ error: "Invalid user data" }, { status: 400 });
    }

    const user = await syncPrivyUser(privyUser);

    return NextResponse.json({ user });
  } catch (err) {
    console.error("User sync error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync failed" }, { status: 500 });
  }
}

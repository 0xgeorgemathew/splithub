import { createFileRoute } from "@tanstack/react-router";
import { syncPrivyUser } from "~~/services/userService";

// POST /api/user/sync - Sync Privy user to Supabase
async function POST(request: Request) {
  try {
    const privyUser = await request.json();

    if (!privyUser || !privyUser.id) {
      return Response.json({ error: "Invalid user data" }, { status: 400 });
    }

    const user = await syncPrivyUser(privyUser);

    return Response.json({ user });
  } catch (err) {
    console.error("User sync error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Sync failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/user/sync")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

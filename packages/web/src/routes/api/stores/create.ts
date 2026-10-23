import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, requireUser } from "~~/lib/auth";
import { createStore } from "~~/services/storeService";

/** Creates a store owned by the signed-in user. Checkout pays their wallet directly. */
async function POST(request: Request) {
  try {
    const { wallet } = await requireUser(request);
    const { storeName, storeDescription } = await request.json();

    if (typeof storeName !== "string" || !storeName.trim()) {
      return Response.json({ error: "Store name is required" }, { status: 400 });
    }
    if (storeDescription !== undefined && storeDescription !== null && typeof storeDescription !== "string") {
      return Response.json({ error: "Description must be text" }, { status: 400 });
    }

    const store = await createStore({ ownerWallet: wallet, storeName, storeDescription });
    return Response.json({ store }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create store");
  }
}

export const Route = createFileRoute("/api/stores/create")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

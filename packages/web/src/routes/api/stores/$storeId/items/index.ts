import { createFileRoute } from "@tanstack/react-router";
import { errorResponse } from "~~/lib/auth";
import { createStoreItem, getStoreItems, parseStoreItemFields, requireStoreOwner } from "~~/services/storeService";

async function GET(_: Request, { params }: { params: { storeId: string } }) {
  try {
    const items = await getStoreItems(Number(params.storeId));
    return Response.json({ items });
  } catch (error) {
    console.error("Fetch store items error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch store items" },
      { status: 500 },
    );
  }
}

/** Adds a catalog item (owner only): name and price, optional description, image URL and starting stock. */
async function POST(request: Request, { params }: { params: { storeId: string } }) {
  try {
    const storeId = Number(params.storeId);
    await requireStoreOwner(request, storeId);
    const parsed = parseStoreItemFields(await request.json(), true);
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
    const { name, price, description, imageUrl, stock } = parsed.fields;

    const item = await createStoreItem({ storeId, name: name!, price: price!, description, imageUrl, stock });
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create store item");
  }
}

export const Route = createFileRoute("/api/stores/$storeId/items/")({
  server: {
    handlers: {
      GET: ({ request, params }) => GET(request, { params }),
      POST: ({ request, params }) => POST(request, { params }),
    },
  },
});

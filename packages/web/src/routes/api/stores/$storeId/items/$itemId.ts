import { createFileRoute } from "@tanstack/react-router";
import { updateStoreItem } from "~~/services/storeService";

async function PATCH(request: Request, { params }: { params: { storeId: string; itemId: string } }) {
  try {
    const { itemId } = params;
    const body = await request.json();

    const item = await updateStoreItem(Number(itemId), {
      name: body.name,
      description: body.description,
      price: body.price !== undefined ? Number(body.price) : undefined,
      status: body.status,
      imageUrl: body.imageUrl,
      currentStock: body.currentStock !== undefined ? Number(body.currentStock) : undefined,
      reorderThreshold: body.reorderThreshold !== undefined ? Number(body.reorderThreshold) : undefined,
      targetStock: body.targetStock !== undefined ? Number(body.targetStock) : undefined,
    });

    return Response.json({ item });
  } catch (error) {
    console.error("Update store item error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update store item" },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/stores/$storeId/items/$itemId")({
  server: {
    handlers: {
      PATCH: ({ request, params }) => PATCH(request, { params }),
    },
  },
});

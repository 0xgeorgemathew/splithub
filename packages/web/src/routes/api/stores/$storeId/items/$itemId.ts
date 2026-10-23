import { createFileRoute } from "@tanstack/react-router";
import { errorResponse } from "~~/lib/auth";
import { supabase } from "~~/lib/supabase";
import { requireStoreManager, updateStoreItem } from "~~/services/storeService";

async function PATCH(request: Request, { params }: { params: { storeId: string; itemId: string } }) {
  try {
    const { storeId, itemId } = params;
    await requireStoreManager(request, Number(storeId));
    const { data: owned } = await supabase
      .from("store_items")
      .select("id")
      .eq("id", Number(itemId))
      .eq("stall_id", Number(storeId))
      .maybeSingle();
    if (!owned) return Response.json({ error: "Item not found in this store" }, { status: 404 });
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
    return errorResponse(error, "Failed to update store item");
  }
}

export const Route = createFileRoute("/api/stores/$storeId/items/$itemId")({
  server: {
    handlers: {
      PATCH: ({ request, params }) => PATCH(request, { params }),
    },
  },
});

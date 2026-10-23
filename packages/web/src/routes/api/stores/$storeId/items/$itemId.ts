import { createFileRoute } from "@tanstack/react-router";
import { errorResponse } from "~~/lib/auth";
import { supabase } from "~~/lib/supabase";
import { parseStoreItemFields, requireStoreOwner, updateStoreItem } from "~~/services/storeService";

/** Edits a catalog item (owner only): name, price, description, image, stock, or active/paused. */
async function PATCH(request: Request, { params }: { params: { storeId: string; itemId: string } }) {
  try {
    const storeId = Number(params.storeId);
    const itemId = Number(params.itemId);
    await requireStoreOwner(request, storeId);
    const { data: owned } = await supabase
      .from("store_items")
      .select("id")
      .eq("id", itemId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!owned) return Response.json({ error: "Item not found in this store" }, { status: 404 });

    const parsed = parseStoreItemFields(await request.json(), false);
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });

    const item = await updateStoreItem(itemId, parsed.fields);
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

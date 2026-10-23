import { createFileRoute } from "@tanstack/react-router";
import { errorResponse } from "~~/lib/auth";
import type { Store } from "~~/lib/store.types";
import { supabase } from "~~/lib/supabase";
import { requireStoreOwner } from "~~/services/storeService";

/** Store settings (owner only): rename, edit the description, open or pause. The slug stays the same. */
async function PATCH(request: Request, storeId: number) {
  try {
    await requireStoreOwner(request, storeId);
    const body = (await request.json()) as Partial<Store>;
    const updates: Partial<Store> = {};

    if (body.store_name !== undefined) {
      if (typeof body.store_name !== "string" || !body.store_name.trim()) {
        return Response.json({ error: "Store name is required" }, { status: 400 });
      }
      updates.store_name = body.store_name.trim();
    }
    if (body.store_description !== undefined) updates.store_description = body.store_description?.trim() || null;
    if (body.status !== undefined) {
      if (!["active", "paused"].includes(body.status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = body.status;
    }
    if (!Object.keys(updates).length) {
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await supabase.from("stores").update(updates).eq("id", storeId).select("*").single();
    if (error) throw new Error(error.message);
    return Response.json({ store: data });
  } catch (error) {
    return errorResponse(error, "Failed to update store");
  }
}

export const Route = createFileRoute("/api/stores/$storeId/")({
  server: {
    handlers: {
      PATCH: ({ request, params }) => PATCH(request, Number(params.storeId)),
    },
  },
});

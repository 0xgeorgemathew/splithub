import { createFileRoute } from "@tanstack/react-router";
import { AuthError, errorResponse } from "~~/lib/auth";
import type { Stall } from "~~/lib/events.types";
import { supabase } from "~~/lib/supabase";
import { requireStoreManager } from "~~/services/storeService";

/**
 * Store settings. Managers can rename the store, edit its description and open or pause it; the network
 * owner can also change the manager share.
 */
async function PATCH(request: Request, storeId: number) {
  try {
    const { isOwner } = await requireStoreManager(request, storeId);
    const body = (await request.json()) as Partial<Stall>;
    const updates: Partial<Stall> = {};

    if (body.stall_name !== undefined) {
      if (!body.stall_name.trim()) return Response.json({ error: "Store name is required" }, { status: 400 });
      updates.stall_name = body.stall_name.trim();
    }
    if (body.stall_description !== undefined) updates.stall_description = body.stall_description || null;
    if (body.status !== undefined) {
      if (!["active", "paused"].includes(body.status))
        return Response.json({ error: "Invalid status" }, { status: 400 });
      updates.status = body.status;
    }
    if (body.split_percentage !== undefined) {
      if (!isOwner) throw new AuthError("Only the store owner can change the manager share", 403);
      const split = Number(body.split_percentage);
      if (!Number.isFinite(split) || split < 0 || split > 100) {
        return Response.json({ error: "Manager share must be between 0 and 100" }, { status: 400 });
      }
      updates.split_percentage = split;
    }

    const { data, error } = await supabase.from("stalls").update(updates).eq("id", storeId).select("*").single();
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

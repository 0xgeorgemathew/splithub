import { createFileRoute } from "@tanstack/react-router";
import { AuthError, errorResponse, requireUser, sameWallet } from "~~/lib/auth";
import type { Stall } from "~~/lib/events.types";
import { deleteStall, getOperatorByWallet, getStallWithEvent, updateStall } from "~~/services/eventsService";

async function requireOwnedStall(request: Request, stallId: number) {
  const { wallet } = await requireUser(request);
  const stall = await getStallWithEvent(stallId);
  if (!stall) throw new AuthError("Stall not found", 403);
  if (!sameWallet(stall.event.owner_wallet, wallet)) throw new AuthError("Only the venue owner can change stalls", 403);
  return stall;
}

/** Updates a stall's details, operator, split or status (venue owner only). */
async function PATCH(request: Request, stallId: number) {
  try {
    await requireOwnedStall(request, stallId);
    const body = (await request.json()) as Partial<Stall>;
    const updates: Partial<Stall> = {};

    if (body.stall_name !== undefined) updates.stall_name = body.stall_name.trim();
    if (body.stall_slug !== undefined) updates.stall_slug = body.stall_slug.trim();
    if (body.stall_description !== undefined) updates.stall_description = body.stall_description || null;
    if (body.status !== undefined) {
      if (!["active", "paused"].includes(body.status))
        return Response.json({ error: "Invalid status" }, { status: 400 });
      updates.status = body.status;
    }
    if (body.split_percentage !== undefined) {
      const split = Number(body.split_percentage);
      if (!Number.isFinite(split) || split < 0 || split > 100) {
        return Response.json({ error: "Operator share must be between 0 and 100" }, { status: 400 });
      }
      updates.split_percentage = split;
    }
    if (body.operator_wallet) {
      // Payments go to the operator's wallet; it must be an existing SplitHub user picked by the owner.
      const operator = await getOperatorByWallet(body.operator_wallet);
      if (!operator) return Response.json({ error: "Stall operator must be a SplitHub user" }, { status: 400 });
      updates.operator_wallet = operator.wallet_address;
      updates.operator_twitter_handle = operator.twitter_handle || operator.name;
    }

    const stall = await updateStall(stallId, updates);
    return Response.json({ stall });
  } catch (error) {
    return errorResponse(error, "Failed to update stall");
  }
}

/** Removes a stall (venue owner only). */
async function DELETE(request: Request, stallId: number) {
  try {
    await requireOwnedStall(request, stallId);
    await deleteStall(stallId);
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete stall");
  }
}

export const Route = createFileRoute("/api/events/stalls/$stallId")({
  server: {
    handlers: {
      PUT: ({ request, params }) => PATCH(request, Number(params.stallId)),
      PATCH: ({ request, params }) => PATCH(request, Number(params.stallId)),
      DELETE: ({ request, params }) => DELETE(request, Number(params.stallId)),
    },
  },
});

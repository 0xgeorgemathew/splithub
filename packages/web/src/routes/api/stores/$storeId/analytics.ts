import { createFileRoute } from "@tanstack/react-router";
import { errorResponse } from "~~/lib/auth";
import { getStoreAnalytics, requireStoreOwner } from "~~/services/storeService";

async function GET(request: Request, { params }: { params: { storeId: string } }) {
  try {
    const storeId = Number(params.storeId);
    await requireStoreOwner(request, storeId);
    const analytics = await getStoreAnalytics(storeId);
    return Response.json({ analytics });
  } catch (error) {
    return errorResponse(error, "Failed to fetch store analytics");
  }
}

export const Route = createFileRoute("/api/stores/$storeId/analytics")({
  server: {
    handlers: {
      GET: ({ request, params }) => GET(request, { params }),
    },
  },
});

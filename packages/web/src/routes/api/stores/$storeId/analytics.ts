import { createFileRoute } from "@tanstack/react-router";
import { getStoreAnalytics } from "~~/services/storeService";

async function GET(_: Request, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    const analytics = await getStoreAnalytics(Number(storeId));
    return Response.json({ analytics });
  } catch (error) {
    console.error("Store analytics error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch store analytics" },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/stores/$storeId/analytics")({
  server: {
    handlers: {
      GET: ({ request, params }) => GET(request, { params }),
    },
  },
});

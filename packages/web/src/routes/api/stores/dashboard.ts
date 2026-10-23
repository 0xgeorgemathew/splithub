import { createFileRoute } from "@tanstack/react-router";
import { isAddress } from "viem";
import { getStoreDashboardData } from "~~/services/storeService";

async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet || !isAddress(wallet)) {
      return Response.json({ error: "Valid wallet query param is required" }, { status: 400 });
    }

    const dashboard = await getStoreDashboardData(wallet);
    return Response.json(dashboard);
  } catch (error) {
    console.error("Store dashboard error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch store dashboard" },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/stores/dashboard")({
  server: {
    handlers: {
      GET: ({ request }) => GET(request),
    },
  },
});

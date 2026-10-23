import { createFileRoute } from "@tanstack/react-router";
import { isAddress } from "viem";
import { getStoreDashboardData } from "~~/services/storeService";

/** Public store list, plus the stores owned by `?wallet=` when given (read-only). */
async function GET(request: Request) {
  try {
    const wallet = new URL(request.url).searchParams.get("wallet");
    if (wallet && !isAddress(wallet)) {
      return Response.json({ error: "wallet must be a valid address" }, { status: 400 });
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

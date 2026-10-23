import { createFileRoute } from "@tanstack/react-router";
import { isAddress } from "viem";
import { TOKENS } from "~~/config/tokens";
import { createStore } from "~~/services/storeService";

async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      adminWallet,
      networkName,
      networkSlug,
      storeName,
      storeSlug,
      storeDescription,
      managerWallet,
      managerTwitterHandle,
      splitPercentage,
      tokenAddress,
    } = body;

    if (!adminWallet || !isAddress(adminWallet)) {
      return Response.json({ error: "Valid adminWallet is required" }, { status: 400 });
    }

    if (!storeName || !networkName) {
      return Response.json({ error: "networkName and storeName are required" }, { status: 400 });
    }

    if (managerWallet && !isAddress(managerWallet)) {
      return Response.json({ error: "managerWallet must be a valid address" }, { status: 400 });
    }

    if (splitPercentage !== undefined && (splitPercentage < 0 || splitPercentage > 100)) {
      return Response.json({ error: "splitPercentage must be between 0 and 100" }, { status: 400 });
    }

    const result = await createStore({
      adminWallet,
      networkName,
      networkSlug: networkSlug || networkName,
      storeName,
      storeSlug: storeSlug || storeName,
      storeDescription,
      managerWallet,
      managerTwitterHandle,
      splitPercentage,
      tokenAddress: tokenAddress || TOKENS.USDC,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error("Create store error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Failed to create store" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/stores/create")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

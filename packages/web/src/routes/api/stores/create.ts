import { createFileRoute } from "@tanstack/react-router";
import { isAddress } from "viem";
import { TOKENS } from "~~/config/tokens";
import { errorResponse, requireUser } from "~~/lib/auth";
import { createStore } from "~~/services/storeService";

/**
 * Creates a store owned by the signed-in user. The store joins their store network (created on first use)
 * and checkout pays the manager wallet, which defaults to the owner.
 */
async function POST(request: Request) {
  try {
    const { wallet } = await requireUser(request);
    const body = await request.json();
    const {
      networkName,
      networkSlug,
      storeName,
      storeSlug,
      storeDescription,
      managerWallet,
      managerTwitterHandle,
      splitPercentage,
    } = body;

    if (!storeName?.trim()) {
      return Response.json({ error: "Store name is required" }, { status: 400 });
    }
    if (managerWallet && !isAddress(managerWallet)) {
      return Response.json({ error: "Manager wallet must be a valid address" }, { status: 400 });
    }
    if (splitPercentage !== undefined && (splitPercentage < 0 || splitPercentage > 100)) {
      return Response.json({ error: "Manager share must be between 0 and 100" }, { status: 400 });
    }

    const name = networkName?.trim() || "My Stores";
    const result = await createStore({
      adminWallet: wallet,
      networkName: name,
      networkSlug: networkSlug || `${name}-${wallet.slice(2, 8)}`,
      storeName,
      storeSlug: storeSlug || storeName,
      storeDescription,
      managerWallet: managerWallet || wallet,
      managerTwitterHandle,
      splitPercentage,
      tokenAddress: TOKENS.USDC,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create store");
  }
}

export const Route = createFileRoute("/api/stores/create")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});

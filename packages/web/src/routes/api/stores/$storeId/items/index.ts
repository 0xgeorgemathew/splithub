import { createFileRoute } from "@tanstack/react-router";
import { isAddress } from "viem";
import { TOKENS } from "~~/config/tokens";
import { createStoreItem, getStoreItems } from "~~/services/storeService";

async function GET(_: Request, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    const items = await getStoreItems(Number(storeId));
    return Response.json({ items });
  } catch (error) {
    console.error("Fetch store items error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch store items" },
      { status: 500 },
    );
  }
}

async function POST(request: Request, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    const body = await request.json();
    const { sku, name, description, price, tokenAddress, imageUrl, currentStock, reorderThreshold, targetStock } = body;

    if (!sku || !name || price === undefined) {
      return Response.json({ error: "sku, name, and price are required" }, { status: 400 });
    }

    if (tokenAddress && !isAddress(tokenAddress)) {
      return Response.json({ error: "tokenAddress must be a valid address" }, { status: 400 });
    }

    const item = await createStoreItem({
      stallId: Number(storeId),
      sku,
      name,
      description,
      price: Number(price),
      tokenAddress: tokenAddress || TOKENS.USDC,
      imageUrl,
      currentStock: currentStock !== undefined ? Number(currentStock) : undefined,
      reorderThreshold: reorderThreshold !== undefined ? Number(reorderThreshold) : undefined,
      targetStock: targetStock !== undefined ? Number(targetStock) : undefined,
    });

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Create store item error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create store item" },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/stores/$storeId/items/")({
  server: {
    handlers: {
      GET: ({ request, params }) => GET(request, { params }),
      POST: ({ request, params }) => POST(request, { params }),
    },
  },
});

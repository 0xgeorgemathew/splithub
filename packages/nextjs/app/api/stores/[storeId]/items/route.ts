import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { TOKENS } from "~~/config/tokens";
import { createStoreItem, getStoreItems } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const items = await getStoreItems(Number(storeId));
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Fetch store items error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch store items" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const body = await request.json();
    const { sku, name, description, price, tokenAddress, imageUrl, currentStock, reorderThreshold, targetStock } = body;

    if (!sku || !name || price === undefined) {
      return NextResponse.json({ error: "sku, name, and price are required" }, { status: 400 });
    }

    if (tokenAddress && !isAddress(tokenAddress)) {
      return NextResponse.json({ error: "tokenAddress must be a valid address" }, { status: 400 });
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

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Create store item error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create store item" },
      { status: 500 },
    );
  }
}

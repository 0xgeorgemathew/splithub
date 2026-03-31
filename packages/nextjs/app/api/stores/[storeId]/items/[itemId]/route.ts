import { NextRequest, NextResponse } from "next/server";
import { updateStoreItem } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string; itemId: string }> },
) {
  try {
    const { itemId } = await params;
    const body = await request.json();

    const item = await updateStoreItem(Number(itemId), {
      name: body.name,
      description: body.description,
      price: body.price !== undefined ? Number(body.price) : undefined,
      status: body.status,
      imageUrl: body.imageUrl,
      currentStock: body.currentStock !== undefined ? Number(body.currentStock) : undefined,
      reorderThreshold: body.reorderThreshold !== undefined ? Number(body.reorderThreshold) : undefined,
      targetStock: body.targetStock !== undefined ? Number(body.targetStock) : undefined,
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Update store item error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update store item" },
      { status: 500 },
    );
  }
}

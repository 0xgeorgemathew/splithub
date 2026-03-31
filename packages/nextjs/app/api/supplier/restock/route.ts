import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function buildRequestId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.STORE_SUPPLIER_SHARED_SECRET;
    const authHeader = request.headers.get("authorization");

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized supplier request" }, { status: 401 });
    }

    const body = await request.json();
    const lineItem = body?.lineItem;

    if (!body?.storeId || !body?.storeName || !body?.agentId || !lineItem?.sku || !lineItem?.unitsToRestock) {
      return NextResponse.json({ error: "Invalid supplier restock payload" }, { status: 400 });
    }

    const requestId = buildRequestId("req");
    const supplierOrderId = buildRequestId("supplier");

    return NextResponse.json({
      accepted: true,
      requestId,
      supplierOrderId,
      supplierName: "SplitHub Demo Supplier",
      message: `Accepted restock for ${lineItem.unitsToRestock} unit(s) of ${lineItem.sku}.`,
      received: {
        storeId: body.storeId,
        storeName: body.storeName,
        agentId: body.agentId,
        triggerSource: body.triggerSource,
        lineItem: {
          itemId: lineItem.itemId,
          sku: lineItem.sku,
          targetStock: lineItem.targetStock,
          unitsToRestock: lineItem.unitsToRestock,
          estimatedValue: lineItem.estimatedValue,
          confidence: lineItem.confidence,
        },
      },
    });
  } catch (error) {
    console.error("Supplier restock webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supplier webhook failed" },
      { status: 500 },
    );
  }
}

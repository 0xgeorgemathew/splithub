type SupplierRestockLineItem = {
  itemId: number;
  sku: string;
  name: string;
  currentStock: number;
  targetStock: number;
  unitsToRestock: number;
  unitPrice: number;
  estimatedValue: number;
  reason: string;
  confidence: number;
};

type SupplierRestockRequest = {
  storeId: number;
  storeName: string;
  networkName?: string;
  operatorWallet?: string | null;
  agentId: string;
  triggerSource: string;
  lineItem: SupplierRestockLineItem;
};

export type SupplierRestockResponse = {
  accepted: boolean;
  mode: "webhook" | "mock";
  requestId: string;
  supplierOrderId: string;
  supplierName: string;
  message?: string;
  raw?: Record<string, any>;
};

const DEFAULT_SUPPLIER_NAME = "SplitHub Supplier Adapter";
const DEFAULT_TIMEOUT_MS = Number(process.env.STORE_SUPPLIER_TIMEOUT_MS || 15000);

function buildMockSupplierResponse(request: SupplierRestockRequest): SupplierRestockResponse {
  const mockId = `mock-${request.storeId}-${request.lineItem.sku}-${Date.now()}`;

  return {
    accepted: true,
    mode: "mock",
    requestId: mockId,
    supplierOrderId: `supplier-${mockId}`,
    supplierName: "Mock Supplier Adapter",
    message: "No supplier webhook configured. Accepted through the built-in mock adapter.",
    raw: {
      request,
    },
  };
}

export async function requestSupplierRestock(request: SupplierRestockRequest): Promise<SupplierRestockResponse> {
  const webhookUrl = process.env.STORE_SUPPLIER_WEBHOOK_URL;

  if (!webhookUrl) {
    return buildMockSupplierResponse(request);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.STORE_SUPPLIER_SHARED_SECRET
          ? { Authorization: `Bearer ${process.env.STORE_SUPPLIER_SHARED_SECRET}` }
          : {}),
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || result.message || `Supplier webhook failed with ${response.status}`);
    }

    return {
      accepted: result.accepted !== false,
      mode: "webhook",
      requestId: result.requestId || result.request_id || `webhook-${Date.now()}`,
      supplierOrderId: result.supplierOrderId || result.supplier_order_id || result.orderId || `supplier-${Date.now()}`,
      supplierName: result.supplierName || result.supplier_name || DEFAULT_SUPPLIER_NAME,
      message: result.message,
      raw: result,
    };
  } finally {
    clearTimeout(timeout);
  }
}

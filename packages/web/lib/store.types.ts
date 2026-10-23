import type { Event, Stall } from "~~/lib/events.types";
import type { StoreInventory, StoreItem, StoreOrder, StoreOrderItem, User } from "~~/lib/supabase";

export type Store = Stall & {
  network?: Event;
  manager_user?: User;
};

export type StoreWithCatalog = Store & {
  items: (StoreItem & {
    inventory?: StoreInventory | null;
  })[];
};

export type CartLineInput = {
  itemId: number;
  quantity: number;
};

export type CheckoutQuote = {
  storeId: number;
  eventId: number;
  tokenAddress: string;
  subtotal: string;
  subtotalMicros: string;
  managerAmount: string;
  managerAmountMicros: string;
  adminAmount: string;
  adminAmountMicros: string;
  /** Accounting split: the manager share of the subtotal (the rest is the network admin's). */
  managerRecipient: `0x${string}`;
  adminRecipient: `0x${string}`;
  /** The single on-chain payment the buyer authorizes with their chip. */
  payoutRecipient: `0x${string}`;
  payoutAmountMicros: string;
  cart: Array<{
    itemId: number;
    name: string;
    quantity: number;
    unitPrice: string;
    unitPriceMicros: string;
    lineTotal: string;
    lineTotalMicros: string;
    currentStock: number;
  }>;
};

export type StoreAnalytics = {
  storeId: number;
  totalRevenue: number;
  totalOrders: number;
  managerRevenue: number;
  adminRevenue: number;
  lowStockItems: number;
  activeItems: number;
  failedOrders: number;
  topItems: Array<{
    itemId: number;
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
};

export type StoreDashboardData = {
  ownedNetworks: Event[];
  managedStores: StoreWithCatalog[];
  publicStores: StoreWithCatalog[];
  recentOrders: StoreOrder[];
  recentOrderItems: StoreOrderItem[];
};

export type CreateStoreInput = {
  adminWallet: string;
  networkName: string;
  networkSlug: string;
  storeName: string;
  storeSlug: string;
  storeDescription?: string;
  managerWallet?: string;
  managerTwitterHandle?: string;
  splitPercentage?: number;
  tokenAddress: string;
};

export type CreateStoreItemInput = {
  stallId: number;
  sku: string;
  name: string;
  description?: string;
  price: number;
  tokenAddress: string;
  imageUrl?: string;
  currentStock?: number;
  reorderThreshold?: number;
  targetStock?: number;
};

export type UpdateStoreItemInput = Partial<{
  name: string;
  description: string;
  price: number;
  status: StoreItem["status"];
  imageUrl: string | null;
  currentStock: number;
  reorderThreshold: number;
  targetStock: number;
}>;

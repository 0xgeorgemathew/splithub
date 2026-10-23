import type { StoreItem, StoreOrder } from "~~/lib/supabase";

/** Active items at or below this stock count show as low stock. */
export const LOW_STOCK_THRESHOLD = 3;

/** A store: set up by one signed-in user, whose wallet receives every checkout payment. */
export type Store = {
  id: number;
  owner_wallet: string;
  store_name: string;
  store_slug: string;
  store_description: string | null;
  status: "active" | "paused";
  created_at: string;
  updated_at: string;
  // Joined data
  owner_user?: {
    name: string;
    twitter_handle?: string | null;
    twitter_profile_url?: string | null;
  } | null;
};

export type StoreWithCatalog = Store & {
  items: StoreItem[];
};

export type CartLineInput = {
  itemId: number;
  quantity: number;
};

export type CheckoutQuote = {
  storeId: number;
  tokenAddress: string;
  subtotal: string;
  subtotalMicros: string;
  /** The single on-chain payment the buyer authorizes with their chip: the whole subtotal to the store owner. */
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
    stock: number;
  }>;
};

export type StoreAnalytics = {
  storeId: number;
  totalRevenue: number;
  totalOrders: number;
  activeItems: number;
  lowStockItems: number;
  topItems: Array<{
    itemId: number;
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  recentOrders: Array<
    Pick<StoreOrder, "id" | "buyer_wallet" | "subtotal" | "tx_hash" | "created_at"> & {
      buyer_name: string | null;
      itemCount: number;
    }
  >;
};

export type StoreDashboardData = {
  /** Stores the given wallet owns (empty when no wallet is given). */
  myStores: StoreWithCatalog[];
  /** Open stores anyone can browse. */
  publicStores: StoreWithCatalog[];
};

export type CreateStoreItemInput = {
  storeId: number;
  name: string;
  description?: string | null;
  price: number;
  stock?: number;
  imageUrl?: string | null;
};

export type UpdateStoreItemInput = Partial<{
  name: string;
  description: string | null;
  price: number;
  stock: number;
  status: StoreItem["status"];
  imageUrl: string | null;
}>;

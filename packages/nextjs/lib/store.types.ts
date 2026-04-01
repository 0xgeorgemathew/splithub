import type { Event, Stall } from "~~/lib/events.types";
import type {
  AgentRun,
  AgentValidation,
  Erc8004AgentRecord,
  ManagerAgent,
  ReputationEventRecord,
  StoreInventory,
  StoreItem,
  StoreOrder,
  StoreOrderItem,
  User,
} from "~~/lib/supabase";

export type Store = Stall & {
  network?: Event;
  manager_user?: User;
};

export type StoreWithCatalog = Store & {
  items: (StoreItem & {
    inventory?: StoreInventory | null;
  })[];
  manager_agent?: ManagerAgent | null;
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
  managerRecipient: `0x${string}`;
  adminRecipient: `0x${string}`;
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
  agentRuns: AgentRun[];
  validations: AgentValidation[];
};

export type StoreTrustSnapshot = {
  managerTrustAgent: Erc8004AgentRecord | null;
  validatorAgent: Erc8004AgentRecord | null;
  reviewerAgent: Erc8004AgentRecord | null;
  managerAutomationEnabled: boolean;
  latestValidation: AgentValidation | null;
  latestReputation: ReputationEventRecord | null;
  reputationEvents: ReputationEventRecord[];
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
  agentName?: string;
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

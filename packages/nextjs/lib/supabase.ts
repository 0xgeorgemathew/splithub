import { RealtimeChannel, RealtimePostgresChangesPayload, createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// User table type
export type User = {
  wallet_address: string;
  chip_address: string | null;
  chip_registration_status?: "pending" | "registered" | "skipped" | null; // Track chip registration state
  approval_status?: "pending" | "completed" | null; // Track token approval completion
  name: string;
  email: string | null; // Now optional (Twitter login doesn't require email)
  privy_user_id?: string | null;
  twitter_handle?: string | null;
  twitter_profile_url?: string | null;
  twitter_user_id?: string | null;
  created_at: string;
};

// Payment request table type
export type PaymentRequest = {
  id: string;
  payer: string;
  recipient: string;
  token: string;
  amount: string;
  memo: string | null;
  status: "pending" | "completed" | "expired";
  tx_hash: string | null;
  expires_at: string;
  created_at: string;
  completed_at?: string;
  // Twitter fields
  requester_twitter?: string | null;
  payer_twitter?: string | null;
  // Joined user data (when fetched with joins)
  recipient_user?: {
    name: string;
    twitter_handle?: string | null;
    twitter_profile_url?: string | null;
  };
  payer_user?: {
    name: string;
    twitter_handle?: string | null;
    twitter_profile_url?: string | null;
  };
};

// Expense table type
export type Expense = {
  id: number;
  created_at: string;
  creator_wallet: string;
  description: string;
  total_amount: number;
  status: string;
  token_address: string;
};

// Expense participant table type
export type ExpenseParticipant = {
  id: number;
  expense_id: number;
  wallet_address: string;
  share_amount: number;
  is_creator: boolean;
  created_at: string;
};

// Settlement table type
export type Settlement = {
  id: number;
  payer_wallet: string;
  payee_wallet: string;
  amount: number;
  token_address: string;
  tx_hash: string | null;
  status: "pending" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
};

// Friend balance type (computed)
export type FriendBalance = {
  friend_wallet: string;
  friend_name: string;
  friend_email: string;
  friend_twitter_handle?: string | null;
  friend_twitter_profile_url?: string | null;
  net_balance: number;
};

// Twitter user type (for friend selector and UI components)
export type TwitterUser = {
  twitter_handle: string;
  twitter_profile_url: string | null;
  wallet_address: string;
  chip_address: string | null;
  name: string;
};

// Circle table type
export type Circle = {
  id: string;
  name: string;
  creator_wallet: string;
  is_active: boolean;
  created_at: string;
};

// Circle member table type
export type CircleMember = {
  id: string;
  circle_id: string;
  member_wallet: string;
  added_at: string;
};

// Circle with members (joined)
export type CircleWithMembers = Circle & {
  members: User[];
};

// Circle with members and ownership flag (for combined creator/member views)
export type CircleWithMembersAndOwnership = CircleWithMembers & {
  isOwner: boolean;
};

export type StoreItem = {
  id: number;
  stall_id: number;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  token_address: string;
  status: "active" | "paused" | "out_of_stock" | "archived";
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreInventory = {
  item_id: number;
  current_stock: number;
  reorder_threshold: number;
  target_stock: number;
  last_restocked_at: string | null;
  updated_at: string;
};

export type StoreOrder = {
  id: number;
  stall_id: number;
  buyer_wallet: string;
  subtotal: number;
  manager_amount: number;
  admin_amount: number;
  token_address: string;
  tx_hash: string | null;
  status: "pending" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
};

export type StoreOrderItem = {
  id: number;
  order_id: number;
  item_id: number;
  quantity: number;
  unit_price: number;
  created_at: string;
};

export type ManagerAgent = {
  id: string;
  stall_id: number;
  agent_name: string;
  operator_wallet: string;
  erc8004_agent_id: string | null;
  agent_address: string | null;
  status: "active" | "paused" | "error";
  budget_daily_calls: number;
  budget_daily_tokens: number;
  max_restock_value: number;
  max_price_change_pct: number;
  min_confidence: number;
  allowed_supplier_urls: string[] | null;
  allowed_skus: string[] | null;
  created_at: string;
  updated_at: string;
};

export type AgentRun = {
  id: string;
  agent_id: string;
  run_type: string;
  trigger_source: string;
  state: "discovering" | "planning" | "executing" | "verifying" | "submitted" | "failed";
  decision_summary: string | null;
  tool_calls_json: Record<string, any>[];
  retries: number;
  failures_json: Record<string, any>[];
  output_json: Record<string, any>;
  compute_cost_estimate: number;
  started_at: string;
  completed_at: string | null;
};

export type AgentValidation = {
  id: string;
  agent_run_id: string;
  erc8004_validation_tx: string | null;
  status: "pending" | "submitted" | "verified" | "failed";
  evidence_uri: string | null;
  created_at: string;
};

// Realtime types for subscriptions
export type { RealtimeChannel, RealtimePostgresChangesPayload };

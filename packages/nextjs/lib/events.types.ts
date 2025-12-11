// Event types
export type Event = {
  id: number;
  created_at: string;
  updated_at: string;
  event_name: string;
  event_slug: string;
  event_description: string | null;
  owner_wallet: string;
  status: "active" | "paused" | "ended";
  start_date: string | null;
  end_date: string | null;
  // Joined data
  owner_user?: {
    name: string;
    twitter_handle?: string | null;
    twitter_profile_url?: string | null;
  };
  stalls?: Stall[];
};

export type Stall = {
  id: number;
  created_at: string;
  updated_at: string;
  event_id: number;
  stall_name: string;
  stall_slug: string;
  stall_description: string | null;
  operator_twitter_handle: string;
  operator_wallet: string | null;
  split_percentage: number;
  status: "active" | "paused";
  token_address: string;
  // Joined data
  operator_user?: {
    name: string;
    twitter_handle?: string | null;
    twitter_profile_url?: string | null;
  };
  event?: Event;
};

export type StallPayment = {
  id: number;
  created_at: string;
  stall_id: number;
  event_id: number;
  payer_wallet: string;
  amount: number;
  token_address: string;
  operator_amount: number;
  owner_amount: number;
  tx_hash: string | null;
  status: "pending" | "completed" | "failed";
  completed_at: string | null;
  memo: string | null;
  // Joined data
  payer_user?: {
    name: string;
    twitter_handle?: string | null;
    twitter_profile_url?: string | null;
  };
};

// Creation types
export type CreateEventData = {
  event_name: string;
  event_slug: string;
  event_description?: string;
  owner_wallet: string;
  start_date?: string;
  end_date?: string;
};

export type CreateStallData = {
  event_id: number;
  stall_name: string;
  stall_slug: string;
  stall_description?: string;
  operator_twitter_handle: string;
  split_percentage: number;
  token_address: string;
};

export type CreateStallPaymentData = {
  stall_id: number;
  event_id: number;
  payer_wallet: string;
  amount: number;
  token_address: string;
  operator_amount: number;
  owner_amount: number;
  memo?: string;
};

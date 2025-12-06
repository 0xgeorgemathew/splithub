import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

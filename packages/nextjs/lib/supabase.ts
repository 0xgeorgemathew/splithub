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
  name: string;
  email: string;
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
  net_balance: number;
};

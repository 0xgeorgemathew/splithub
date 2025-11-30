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

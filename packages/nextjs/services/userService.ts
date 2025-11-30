import { type User, supabase } from "~~/lib/supabase";

/**
 * Ensures a user exists in the database
 * If the user doesn't exist, creates a minimal user record
 */
export async function ensureUserExists(walletAddress: string, userData?: Partial<User>): Promise<User> {
  // Check if user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  if (existingUser && !fetchError) {
    return existingUser as User;
  }

  // User doesn't exist, create them
  const newUser = {
    wallet_address: walletAddress.toLowerCase(),
    name: userData?.name || `User ${walletAddress.slice(0, 6)}`,
    email: userData?.email || `${walletAddress.slice(0, 8)}@splithub.temp`,
    chip_address: userData?.chip_address || null,
  };

  const { data: createdUser, error: insertError } = await supabase.from("users").insert(newUser).select().single();

  if (insertError) {
    throw new Error(`Failed to create user: ${insertError.message}`);
  }

  return createdUser as User;
}

/**
 * Gets a user by wallet address
 */
export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  if (error) {
    return null;
  }

  return data as User;
}

/**
 * Checks if a user exists
 */
export async function userExists(walletAddress: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("wallet_address")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  return !error && !!data;
}

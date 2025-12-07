import { type User as PrivyUser } from "@privy-io/react-auth";
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

/**
 * Syncs a Privy user to Supabase
 * Called automatically on login via UserSyncWrapper
 */
export async function syncPrivyUser(privyUser: PrivyUser): Promise<User> {
  const embeddedWallet = privyUser.wallet;
  const twitter = privyUser.twitter;

  if (!embeddedWallet?.address) {
    throw new Error("No embedded wallet found");
  }

  if (!twitter) {
    throw new Error("No Twitter account linked");
  }

  const walletAddress = embeddedWallet.address.toLowerCase();

  // Check if user already exists by privy_user_id
  const { data: existingByPrivyId } = await supabase
    .from("users")
    .select("*")
    .eq("privy_user_id", privyUser.id)
    .single();

  // Also check if user exists by wallet_address (handles migration/edge cases)
  const { data: existingByWallet } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", walletAddress)
    .single();

  const userData = {
    privy_user_id: privyUser.id,
    twitter_handle: twitter.username || null,
    twitter_profile_url: twitter.profilePictureUrl || null,
    twitter_user_id: twitter.subject || null,
    wallet_address: walletAddress,
    name: twitter.name || twitter.username || `User ${walletAddress.slice(0, 6)}`,
    email: null, // No email with Twitter login
  };

  // Case 1: User exists by privy_user_id - update them
  if (existingByPrivyId) {
    const { data, error } = await supabase
      .from("users")
      .update(userData)
      .eq("privy_user_id", privyUser.id)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  }

  // Case 2: User exists by wallet but not privy_id (legacy/migration case) - update with privy_id
  if (existingByWallet) {
    const { data, error } = await supabase
      .from("users")
      .update(userData)
      .eq("wallet_address", walletAddress)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  }

  // Case 3: New user - create them
  const { data, error } = await supabase
    .from("users")
    .insert({ ...userData, chip_address: null })
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

/**
 * Gets a user by Twitter handle
 */
export async function getUserByTwitter(twitterHandle: string): Promise<User | null> {
  const { data, error } = await supabase.from("users").select("*").eq("twitter_handle", twitterHandle).single();

  if (error) return null;
  return data as User;
}

/**
 * Gets a user by Privy user ID
 */
export async function getUserByPrivyId(privyUserId: string): Promise<User | null> {
  const { data, error } = await supabase.from("users").select("*").eq("privy_user_id", privyUserId).single();

  if (error) return null;
  return data as User;
}

/**
 * Search users by Twitter handle (for friend selector)
 */
export async function searchUsersByTwitter(query: string, limit = 20): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("twitter_handle", `%${query}%`)
    .limit(limit)
    .order("twitter_handle");

  if (error) {
    console.error("Search error:", error);
    return [];
  }

  return (data || []) as User[];
}

/**
 * Updates a user's OneSignal player ID for push notifications
 */
export async function updateOneSignalPlayerId(walletAddress: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ onesignal_player_id: playerId })
    .eq("wallet_address", walletAddress.toLowerCase());

  if (error) {
    throw new Error(`Failed to update OneSignal player ID: ${error.message}`);
  }
}

/**
 * Gets a user's OneSignal player ID
 */
export async function getOneSignalPlayerId(walletAddress: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("onesignal_player_id")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  if (error || !data) return null;
  return data.onesignal_player_id;
}

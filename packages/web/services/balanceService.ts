import { type FriendBalance, supabase } from "~~/lib/supabase";

/**
 * Computes per-friend balances for a given user
 *
 * Algorithm:
 * 1. Find all expenses where user is creator → friends owe user their share
 * 2. Find all expenses where user is participant → user owes creator their share
 * 3. Aggregate by friend and compute net balance
 * 4. Subtract any completed settlements
 *
 * Positive balance = friend owes you
 * Negative balance = you owe friend
 */
export async function getFriendBalances(userWallet: string): Promise<FriendBalance[]> {
  // Normalize wallet address to lowercase for consistency
  const normalizedUserWallet = userWallet.toLowerCase();

  // Step 1: Get all expenses where user is the creator
  // Other participants owe the user
  const { data: asCreatorData, error: asCreatorError } = await supabase
    .from("expense_participants")
    .select(
      `
      wallet_address,
      share_amount,
      expense!inner (
        creator_wallet,
        status
      )
    `,
    )
    .eq("expense.creator_wallet", normalizedUserWallet)
    .eq("is_creator", false)
    .eq("expense.status", "active");

  if (asCreatorError) {
    throw new Error(`Failed to fetch creator expenses: ${asCreatorError.message}`);
  }

  // Step 2: Get all expenses where user is a participant (not creator)
  // User owes the creator
  const { data: asParticipantData, error: asParticipantError } = await supabase
    .from("expense_participants")
    .select(
      `
      wallet_address,
      share_amount,
      expense!inner (
        creator_wallet,
        status
      )
    `,
    )
    .eq("wallet_address", normalizedUserWallet)
    .eq("is_creator", false)
    .eq("expense.status", "active");

  if (asParticipantError) {
    throw new Error(`Failed to fetch participant expenses: ${asParticipantError.message}`);
  }

  // Step 3: Get all completed settlements where user is involved
  const { data: settlementsData, error: settlementsError } = await supabase
    .from("settlements")
    .select("*")
    .eq("status", "completed")
    .or(`payer_wallet.eq.${normalizedUserWallet},payee_wallet.eq.${normalizedUserWallet}`);

  if (settlementsError) {
    throw new Error(`Failed to fetch settlements: ${settlementsError.message}`);
  }

  // Step 4: Aggregate balances by friend
  const balances: Record<string, number> = {};

  // Add amounts where friends owe user (user is creator)
  asCreatorData?.forEach((item: any) => {
    const friendWallet = item.wallet_address;
    const amount = Number(item.share_amount);
    balances[friendWallet] = (balances[friendWallet] || 0) + amount;
  });

  // Subtract amounts where user owes friends (user is participant)
  asParticipantData?.forEach((item: any) => {
    const creatorWallet = item.expense.creator_wallet;
    const amount = Number(item.share_amount);
    balances[creatorWallet] = (balances[creatorWallet] || 0) - amount;
  });

  // Adjust for settlements
  settlementsData?.forEach(settlement => {
    const amount = Number(settlement.amount);
    if (settlement.payer_wallet === normalizedUserWallet) {
      // User paid someone → reduces what user owes (adds to negative balance)
      balances[settlement.payee_wallet] = (balances[settlement.payee_wallet] || 0) + amount;
    } else if (settlement.payee_wallet === normalizedUserWallet) {
      // Someone paid user → reduces what they owe user (subtracts from positive balance)
      balances[settlement.payer_wallet] = (balances[settlement.payer_wallet] || 0) - amount;
    }
  });

  // Step 5: Fetch user details for each friend and format result
  // Filter out balances less than $0.01 (1 cent) to hide settled/zero balances
  const friendWallets = Object.keys(balances).filter(wallet => Math.abs(balances[wallet]) > 0.01);

  if (friendWallets.length === 0) {
    return [];
  }

  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("wallet_address, name, email, twitter_handle, twitter_profile_url")
    .in("wallet_address", friendWallets);

  if (usersError) {
    throw new Error(`Failed to fetch user details: ${usersError.message}`);
  }

  // Map to FriendBalance format
  const result: FriendBalance[] =
    usersData?.map(user => ({
      friend_wallet: user.wallet_address,
      friend_name: user.name,
      friend_email: user.email,
      friend_twitter_handle: user.twitter_handle,
      friend_twitter_profile_url: user.twitter_profile_url,
      net_balance: balances[user.wallet_address],
    })) || [];

  // Sort by absolute balance (descending)
  result.sort((a, b) => Math.abs(b.net_balance) - Math.abs(a.net_balance));

  return result;
}

/**
 * Get overall balance for a user (total owed to user - total user owes)
 */
export async function getOverallBalance(userWallet: string): Promise<number> {
  const balances = await getFriendBalances(userWallet);
  return balances.reduce((total, balance) => total + balance.net_balance, 0);
}

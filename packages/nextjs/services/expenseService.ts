import { ensureUserExists } from "./userService";
import { type Expense, type ExpenseParticipant, supabase } from "~~/lib/supabase";

export interface CreateExpenseParams {
  creatorWallet: string;
  description: string;
  totalAmount: number;
  tokenAddress: string;
  participantWallets: string[]; // Including creator
}

export interface CreateExpenseResult {
  expense: Expense;
  participants: ExpenseParticipant[];
}

/**
 * Creates an expense and splits it equally among participants
 */
export async function createExpense(params: CreateExpenseParams): Promise<CreateExpenseResult> {
  const { creatorWallet, description, totalAmount, tokenAddress, participantWallets } = params;

  // Normalize all wallet addresses to lowercase for consistency
  const normalizedCreatorWallet = creatorWallet.toLowerCase();
  const normalizedParticipantWallets = participantWallets.map(w => w.toLowerCase());

  // Validate
  if (!normalizedParticipantWallets.includes(normalizedCreatorWallet)) {
    throw new Error("Creator must be included in participants");
  }

  if (normalizedParticipantWallets.length === 0) {
    throw new Error("Must have at least one participant");
  }

  if (totalAmount <= 0) {
    throw new Error("Total amount must be greater than 0");
  }

  // Ensure all participants exist in the users table
  // This prevents foreign key constraint violations
  for (const wallet of normalizedParticipantWallets) {
    await ensureUserExists(wallet);
  }

  // Calculate equal share per person
  const participantCount = normalizedParticipantWallets.length;
  const shareAmount = totalAmount / participantCount;

  // 1. Insert expense
  const { data: expenseData, error: expenseError } = await supabase
    .from("expense")
    .insert({
      creator_wallet: normalizedCreatorWallet,
      description,
      total_amount: totalAmount,
      status: "active",
      token_address: tokenAddress,
    })
    .select()
    .single();

  if (expenseError || !expenseData) {
    throw new Error(`Failed to create expense: ${expenseError?.message}`);
  }

  const expense = expenseData as Expense;

  // 2. Insert participants
  const participantInserts = normalizedParticipantWallets.map(wallet => ({
    expense_id: expense.id,
    wallet_address: wallet,
    share_amount: shareAmount,
    is_creator: wallet === normalizedCreatorWallet,
  }));

  const { data: participantsData, error: participantsError } = await supabase
    .from("expense_participants")
    .insert(participantInserts)
    .select();

  if (participantsError || !participantsData) {
    // Rollback expense if participants insert fails
    await supabase.from("expense").delete().eq("id", expense.id);
    throw new Error(`Failed to add participants: ${participantsError?.message}`);
  }

  // 3. Cancel any pending payment requests for these participants
  // (the balance has changed, so old requests are now stale)
  const otherParticipants = normalizedParticipantWallets.filter(w => w !== normalizedCreatorWallet);
  if (otherParticipants.length > 0) {
    const { error: cancelError } = await supabase
      .from("payment_requests")
      .delete()
      .eq("recipient", normalizedCreatorWallet)
      .eq("status", "pending")
      .in("payer", otherParticipants);

    if (cancelError) {
      console.error("Failed to cancel stale payment requests:", cancelError);
      // Don't throw - this is not critical
    }
  }

  return {
    expense,
    participants: participantsData as ExpenseParticipant[],
  };
}

/**
 * Get all expenses for a user (either created by them or they're a participant)
 */
export async function getUserExpenses(userWallet: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expense_participants")
    .select(
      `
      expense_id,
      expense (*)
    `,
    )
    .eq("wallet_address", userWallet);

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  // Extract expenses from the joined query
  const expenses = data?.map((item: any) => item.expense as Expense) || [];
  return expenses;
}

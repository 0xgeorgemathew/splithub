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

  // Validate
  if (!participantWallets.includes(creatorWallet)) {
    throw new Error("Creator must be included in participants");
  }

  if (participantWallets.length === 0) {
    throw new Error("Must have at least one participant");
  }

  if (totalAmount <= 0) {
    throw new Error("Total amount must be greater than 0");
  }

  // Calculate equal share per person
  const participantCount = participantWallets.length;
  const shareAmount = totalAmount / participantCount;

  // 1. Insert expense
  const { data: expenseData, error: expenseError } = await supabase
    .from("expense")
    .insert({
      creator_wallet: creatorWallet,
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
  const participantInserts = participantWallets.map(wallet => ({
    expense_id: expense.id,
    wallet_address: wallet,
    share_amount: shareAmount,
    is_creator: wallet === creatorWallet,
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

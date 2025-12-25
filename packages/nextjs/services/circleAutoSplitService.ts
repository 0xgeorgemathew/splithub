/**
 * Circle Auto-Split Service
 *
 * Automatically splits payments among Circle members when a user with
 * an active Circle makes a payment. Creates an expense record to track
 * the split amounts.
 */
import { getActiveCircle, getCircleMembers } from "./circleService";
import { createExpense } from "./expenseService";
import { formatUnits } from "viem";
import { TOKEN_DECIMALS } from "~~/config/tokens";

export interface CircleSplitParams {
  /** Wallet address of the payer/buyer */
  userWallet: string;
  /** Amount in wei (smallest unit) */
  amount: bigint | string;
  /** Token contract address */
  tokenAddress: string;
  /** Token decimals (defaults to USDC decimals) */
  decimals?: number;
  /** Optional description for the expense */
  description?: string;
}

export interface CircleSplitResult {
  /** Name of the Circle that was split with */
  circleName: string;
  /** Number of members in the Circle (excluding payer) */
  memberCount: number;
  /** Formatted split amount per person */
  splitAmount: string;
  /** ID of the created expense record */
  expenseId: number;
}

/**
 * Processes Circle auto-split for a payment or purchase
 *
 * If the user has an active Circle with members, creates an expense
 * record splitting the amount equally among all participants.
 *
 * @param params - Split parameters
 * @returns Split result if successful, null if no active Circle or no members
 */
export async function processCircleAutoSplit(params: CircleSplitParams): Promise<CircleSplitResult | null> {
  const { userWallet, amount, tokenAddress, decimals = TOKEN_DECIMALS.USDC, description } = params;

  const normalizedWallet = userWallet.toLowerCase();
  const amountBigInt = typeof amount === "string" ? BigInt(amount) : amount;

  // Check if user has an active Circle
  const activeCircle = await getActiveCircle(normalizedWallet);
  if (!activeCircle) {
    return null;
  }

  console.log("Active Circle found:", activeCircle.name);

  // Get Circle members
  const members = await getCircleMembers(activeCircle.id);
  console.log("Circle members:", members.length);

  if (members.length === 0) {
    return null;
  }

  // Calculate split amount: total / (members + payer)
  const totalParticipants = members.length + 1;
  const splitAmountWei = amountBigInt / BigInt(totalParticipants);

  // Format amounts for logging and expense creation
  const splitAmountFormatted = formatUnits(splitAmountWei, decimals);
  const totalAmountFormatted = parseFloat(formatUnits(amountBigInt, decimals));

  console.log(`Split: ${formatUnits(amountBigInt, decimals)} / ${totalParticipants} = ${splitAmountFormatted} each`);

  // Create expense record
  const participantWallets = [normalizedWallet, ...members.map(m => m.wallet_address.toLowerCase())];

  const expenseResult = await createExpense({
    creatorWallet: normalizedWallet,
    description: description || `Circle: ${activeCircle.name}`,
    totalAmount: totalAmountFormatted,
    tokenAddress: tokenAddress.toLowerCase(),
    participantWallets,
  });

  console.log("Expense created:", expenseResult.expense.id);

  return {
    circleName: activeCircle.name,
    memberCount: members.length,
    splitAmount: splitAmountFormatted,
    expenseId: expenseResult.expense.id,
  };
}

/**
 * Safely processes Circle auto-split, catching and logging errors
 *
 * Use this when Circle split is non-critical and should not fail
 * the main operation (e.g., payment relay).
 *
 * @param params - Split parameters
 * @returns Split result if successful, null on any error
 */
export async function safeProcessCircleAutoSplit(params: CircleSplitParams): Promise<CircleSplitResult | null> {
  try {
    return await processCircleAutoSplit(params);
  } catch (error) {
    console.error("Circle auto-split error (non-critical):", error);
    return null;
  }
}

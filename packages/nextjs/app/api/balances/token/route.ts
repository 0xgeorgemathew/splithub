import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~~/lib/supabase";

/**
 * GET /api/balances/token
 * Fetches the token address used in expenses between two users
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get("userWallet");
    const friendWallet = searchParams.get("friendWallet");

    if (!userWallet || !friendWallet) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Normalize wallet addresses to lowercase
    const normalizedUserWallet = userWallet.toLowerCase();
    const normalizedFriendWallet = friendWallet.toLowerCase();

    // Find expenses where user is creator and friend is participant
    const { data: asCreatorData, error: asCreatorError } = await supabase
      .from("expense_participants")
      .select(
        `
        expense!inner (
          token_address,
          creator_wallet
        )
      `,
      )
      .eq("wallet_address", normalizedFriendWallet)
      .eq("expense.creator_wallet", normalizedUserWallet)
      .limit(1);

    if (asCreatorError) {
      throw new Error(`Failed to fetch expenses: ${asCreatorError.message}`);
    }

    // If we found an expense, use its token address
    if (asCreatorData && asCreatorData.length > 0 && asCreatorData[0].expense) {
      const tokenAddress = (asCreatorData[0].expense as any).token_address;
      return NextResponse.json({ tokenAddress });
    }

    // Fallback: Check if user is participant and friend is creator
    const { data: asParticipantData, error: asParticipantError } = await supabase
      .from("expense_participants")
      .select(
        `
        expense!inner (
          token_address,
          creator_wallet
        )
      `,
      )
      .eq("wallet_address", normalizedUserWallet)
      .eq("expense.creator_wallet", normalizedFriendWallet)
      .limit(1);

    if (asParticipantError) {
      throw new Error(`Failed to fetch expenses: ${asParticipantError.message}`);
    }

    // If we found an expense, use its token address
    if (asParticipantData && asParticipantData.length > 0 && asParticipantData[0].expense) {
      const tokenAddress = (asParticipantData[0].expense as any).token_address;
      return NextResponse.json({ tokenAddress });
    }

    // Final fallback: return default USDT token address
    const defaultTokenAddress = "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a";
    return NextResponse.json({ tokenAddress: defaultTokenAddress });
  } catch (error) {
    console.error("Error fetching token address:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch token address" },
      { status: 500 },
    );
  }
}

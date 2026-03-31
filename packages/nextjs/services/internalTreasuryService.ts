import { parseEther, parseUnits } from "viem";
import { TOKENS, TOKEN_DECIMALS } from "~~/config/tokens";

export type FundAsset = "USDC" | "ETH";

/**
 * Build an unsigned funding transaction from Privy wallet
 * to the authenticated Vincent wallet.
 *
 * The actual signing and submission happens client-side through the
 * Privy embedded wallet (wagmi sendTransaction).
 */
export async function buildFundAgentTransaction(params: {
  amount: string;
  asset: FundAsset;
  targetWalletAddress: string;
}) {
  if (params.asset === "ETH") {
    return {
      to: params.targetWalletAddress as `0x${string}`,
      data: "0x" as `0x${string}`,
      value: parseEther(params.amount),
      targetVincentWallet: params.targetWalletAddress,
      asset: params.asset,
    };
  }

  const amountWei = parseUnits(params.amount, TOKEN_DECIMALS.USDC);

  return {
    to: TOKENS.USDC as `0x${string}`,
    data: encodeTransfer(params.targetWalletAddress as `0x${string}`, amountWei),
    value: BigInt(0),
    targetVincentWallet: params.targetWalletAddress,
    asset: params.asset,
  };
}

/**
 * Encode an ERC-20 transfer call.
 */
function encodeTransfer(to: `0x${string}`, amount: bigint): `0x${string}` {
  const selector = "a9059cbb";
  const paddedTo = to.slice(2).toLowerCase().padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");
  return `0x${selector}${paddedTo}${paddedAmount}` as `0x${string}`;
}

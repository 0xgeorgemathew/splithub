import { parseUnits } from "viem";
import { TOKENS, TOKEN_DECIMALS } from "~~/config/tokens";
import { getVincentAgentAccount, getVincentConfigFromEnv } from "~~/lib/vincent";

/**
 * Build an unsigned ERC-20 transfer transaction from Privy wallet
 * to the shared Vincent smart account.
 *
 * The actual signing and submission happens client-side through the
 * Privy embedded wallet (wagmi sendTransaction).
 */
export async function buildFundAgentTransaction(params: { amount: string }) {
  const config = getVincentConfigFromEnv();
  const account = await getVincentAgentAccount(config);

  const amountWei = parseUnits(params.amount, TOKEN_DECIMALS.USDC);

  // Return the transaction parameters for the client to submit
  // through the Privy embedded wallet
  return {
    to: TOKENS.USDC as `0x${string}`,
    data: encodeTransfer(account.smartAccountAddress as `0x${string}`, amountWei),
    value: BigInt(0),
    targetSmartAccount: account.smartAccountAddress,
  };
}

/**
 * Encode an ERC-20 transfer call.
 */
function encodeTransfer(to: `0x${string}`, amount: bigint): `0x${string}` {
  // Manual ABI encoding for transfer(address,uint256)
  // selector: 0xa9059cbb
  const selector = "a9059cbb";
  const paddedTo = to.slice(2).toLowerCase().padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");
  return `0x${selector}${paddedTo}${paddedAmount}` as `0x${string}`;
}

/**
 * Get the Vincent smart account address for funding.
 */
export async function getAgentSmartAccountAddress(): Promise<string> {
  const config = getVincentConfigFromEnv();
  const account = await getVincentAgentAccount(config);
  return account.smartAccountAddress;
}

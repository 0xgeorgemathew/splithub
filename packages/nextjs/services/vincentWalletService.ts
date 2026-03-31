import { formatUnits } from "viem";
import { TOKENS, TOKEN_DECIMALS } from "~~/config/tokens";
import { createFreshBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { ERC20_ABI } from "~~/lib/contractAbis";
import { getVincentAgentAccount, getVincentConfigFromEnv, getVincentPortfolioBalances } from "~~/lib/vincent";

export interface WalletSnapshot {
  /** Privy embedded wallet USDC balance */
  privyUsdc: string;
  /** Vincent smart account liquid reserve balance */
  agentLiquidUsdc: string;
  /** Reserve asset supplied to Aave through Vincent wallet */
  agentAaveSuppliedUsdc: string;
  /** Reserve asset available to withdraw from Aave */
  agentAaveWithdrawableUsdc: string;
  /** Reserve asset label reported by Vincent */
  agentAssetSymbol: string;
  /** Vincent wallet addresses */
  agentAddresses: {
    eoaAddress: string;
    smartAccountAddress: string;
  };
}

/**
 * Fetch USDC balance for a given wallet address on Base Sepolia.
 */
async function getUsdcBalance(walletAddress: string): Promise<string> {
  const client = createFreshBaseSepoliaPublicClient();

  const raw = await client.readContract({
    address: TOKENS.USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [walletAddress as `0x${string}`],
  });

  return formatUnits(raw as bigint, TOKEN_DECIMALS.USDC);
}

/**
 * Split Vincent's balance inventory into liquid reserve and Aave position.
 */
function extractVincentReserveBalances(
  tokens: Awaited<ReturnType<typeof getVincentPortfolioBalances>>["tokens"],
): Pick<
  WalletSnapshot,
  "agentLiquidUsdc" | "agentAaveSuppliedUsdc" | "agentAaveWithdrawableUsdc" | "agentAssetSymbol"
> {
  const reserveTokenAddress = TOKENS.USDC.toLowerCase();
  const liquidToken = tokens.find(token => token.tokenAddress.toLowerCase() === reserveTokenAddress);
  const aaveToken = tokens.find(token => {
    const symbol = token.symbol.toLowerCase();
    const name = token.name.toLowerCase();
    return symbol.startsWith("a") && name.includes("aave");
  });

  const liquid = liquidToken ? formatUnits(BigInt(liquidToken.tokenBalance), liquidToken.decimals) : "0";
  const supplied = aaveToken ? formatUnits(BigInt(aaveToken.tokenBalance), aaveToken.decimals) : "0";

  return {
    agentLiquidUsdc: liquid,
    agentAaveSuppliedUsdc: supplied,
    agentAaveWithdrawableUsdc: supplied,
    agentAssetSymbol: liquidToken?.symbol || "Stablecoin",
  };
}

/**
 * Build a complete wallet snapshot combining Privy and Vincent wallet state.
 */
export async function getWalletSnapshot(privyWalletAddress: string): Promise<WalletSnapshot> {
  const vincentConfig = getVincentConfigFromEnv();
  const [vincentAccount, privyUsdc, vincentBalances] = await Promise.all([
    getVincentAgentAccount(vincentConfig),
    getUsdcBalance(privyWalletAddress),
    getVincentPortfolioBalances(vincentConfig),
  ]);
  const reserveBalances = extractVincentReserveBalances(vincentBalances.tokens);

  return {
    privyUsdc,
    agentLiquidUsdc: reserveBalances.agentLiquidUsdc,
    agentAaveSuppliedUsdc: reserveBalances.agentAaveSuppliedUsdc,
    agentAaveWithdrawableUsdc: reserveBalances.agentAaveWithdrawableUsdc,
    agentAssetSymbol: reserveBalances.agentAssetSymbol,
    agentAddresses: {
      eoaAddress: vincentAccount.eoaAddress,
      smartAccountAddress: vincentAccount.smartAccountAddress,
    },
  };
}

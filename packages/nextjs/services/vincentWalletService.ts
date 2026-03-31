import { formatUnits } from "viem";
import { TOKENS, TOKEN_DECIMALS } from "~~/config/tokens";
import { createFreshBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { ERC20_ABI } from "~~/lib/contractAbis";

export interface WalletSnapshot {
  /** Observed user wallet USDC balance (Privy or chip wallet) */
  privyUsdc: string;
  privyUsdcRaw: string;
  /** Vincent wallet liquid reserve balance */
  agentLiquidUsdc: string;
  agentLiquidUsdcRaw: string;
  /** Reserve asset supplied to Aave through Vincent wallet */
  agentAaveSuppliedUsdc: string;
  agentAaveSuppliedUsdcRaw: string;
  /** Reserve asset available to withdraw from Aave */
  agentAaveWithdrawableUsdc: string;
  agentAaveWithdrawableUsdcRaw: string;
  /** Reserve asset label */
  agentAssetSymbol: string;
  /** Vincent wallet addresses */
  agentAddresses: {
    eoaAddress: string;
    smartAccountAddress: string;
  };
}

interface WalletSnapshotParams {
  observedWalletAddress: string;
  vincentWalletAddress: string;
  agentAddress: string;
}

const AAVE_POOL_ADDRESS = "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27" as const;
const AAVE_POOL_ABI = [
  {
    type: "function",
    name: "getReserveData",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      {
        name: "reserveData",
        type: "tuple",
        components: [
          { name: "configuration", type: "uint256" },
          { name: "liquidityIndex", type: "uint128" },
          { name: "currentLiquidityRate", type: "uint128" },
          { name: "variableBorrowIndex", type: "uint128" },
          { name: "currentVariableBorrowRate", type: "uint128" },
          { name: "currentStableBorrowRate", type: "uint128" },
          { name: "lastUpdateTimestamp", type: "uint40" },
          { name: "id", type: "uint16" },
          { name: "aTokenAddress", type: "address" },
          { name: "stableDebtTokenAddress", type: "address" },
          { name: "variableDebtTokenAddress", type: "address" },
          { name: "interestRateStrategyAddress", type: "address" },
          { name: "accruedToTreasury", type: "uint128" },
          { name: "unbacked", type: "uint128" },
          { name: "isolationModeTotalDebt", type: "uint128" },
        ],
      },
    ],
  },
] as const;

let cachedUsdcATokenAddress: string | null = null;

export async function getUsdcBalanceRaw(walletAddress: string): Promise<bigint> {
  const client = createFreshBaseSepoliaPublicClient();

  return (await client.readContract({
    address: TOKENS.USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [walletAddress as `0x${string}`],
  })) as bigint;
}

async function getUsdcBalance(walletAddress: string): Promise<string> {
  return formatUnits(await getUsdcBalanceRaw(walletAddress), TOKEN_DECIMALS.USDC);
}

export async function getUsdcATokenAddress() {
  if (cachedUsdcATokenAddress) {
    return cachedUsdcATokenAddress;
  }

  const client = createFreshBaseSepoliaPublicClient();
  const reserveData = await client.readContract({
    address: AAVE_POOL_ADDRESS,
    abi: AAVE_POOL_ABI,
    functionName: "getReserveData",
    args: [TOKENS.USDC],
  });

  cachedUsdcATokenAddress = reserveData.aTokenAddress;
  return cachedUsdcATokenAddress;
}

export async function getUsdcATokenBalanceRaw(walletAddress: string): Promise<bigint> {
  const aTokenAddress = await getUsdcATokenAddress();
  const client = createFreshBaseSepoliaPublicClient();

  return (await client.readContract({
    address: aTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [walletAddress as `0x${string}`],
  })) as bigint;
}

export async function getWalletSnapshot(params: WalletSnapshotParams): Promise<WalletSnapshot> {
  const [observedWalletUsdcRaw, vincentLiquidUsdcRaw, rawATokenBalance] = await Promise.all([
    getUsdcBalanceRaw(params.observedWalletAddress),
    getUsdcBalanceRaw(params.vincentWalletAddress),
    getUsdcATokenBalanceRaw(params.vincentWalletAddress),
  ]);

  const observedWalletUsdc = formatUnits(observedWalletUsdcRaw, TOKEN_DECIMALS.USDC);
  const vincentLiquidUsdc = formatUnits(vincentLiquidUsdcRaw, TOKEN_DECIMALS.USDC);
  const suppliedUsdc = formatUnits(rawATokenBalance, TOKEN_DECIMALS.USDC);

  return {
    privyUsdc: observedWalletUsdc,
    privyUsdcRaw: observedWalletUsdcRaw.toString(),
    agentLiquidUsdc: vincentLiquidUsdc,
    agentLiquidUsdcRaw: vincentLiquidUsdcRaw.toString(),
    agentAaveSuppliedUsdc: suppliedUsdc,
    agentAaveSuppliedUsdcRaw: rawATokenBalance.toString(),
    agentAaveWithdrawableUsdc: suppliedUsdc,
    agentAaveWithdrawableUsdcRaw: rawATokenBalance.toString(),
    agentAssetSymbol: "USDC",
    agentAddresses: {
      eoaAddress: params.vincentWalletAddress,
      smartAccountAddress: params.agentAddress,
    },
  };
}

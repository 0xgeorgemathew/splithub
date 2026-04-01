import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const WETH = "0x4200000000000000000000000000000000000006" as const;
const cbBTC = "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf" as const;

const AAVE_V3_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" as const;
const COMPOUND_V3_WETH = "0x46e6B214b524310239732D51387075E0e70970bf" as const;
const MOONWELL_WETH = "0x628ff693426583D9a7FB391E54366292F509D457" as const;
const MOONWELL_cbBTC = "0xF877ACaFA28c19b96727966690b2f44d35aD5976" as const;

const SECONDS_PER_YEAR = 31_536_000;
const BASE_BLOCKS_PER_YEAR = 15_768_000;
const RAY = 10n ** 27n;

const aavePoolAbi = [
  {
    type: "function",
    name: "getReserveData",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      {
        name: "",
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
    stateMutability: "view",
  },
] as const;

const cometAbi = [
  {
    type: "function",
    name: "getUtilization",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSupplyRate",
    inputs: [{ name: "utilization", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const moonwellMarketAbi = [
  {
    type: "function",
    name: "supplyRatePerBlock",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

function createBaseMainnetClient() {
  return createPublicClient({
    chain: base,
    transport: http(),
  });
}

function rayToApy(rateRay: bigint): string {
  const scaled = (rateRay * 10000n) / RAY;
  return (Number(scaled) / 100).toFixed(2);
}

function compoundRateToApy(ratePerSecond: bigint): string {
  const r = Number(ratePerSecond) / 1e18;
  const apy = (Math.pow(1 + r, SECONDS_PER_YEAR) - 1) * 100;
  return apy.toFixed(2);
}

function moonwellRateToApy(ratePerBlock: bigint): string {
  const r = Number(ratePerBlock) / 1e18;
  const apy = (Math.pow(1 + r, BASE_BLOCKS_PER_YEAR) - 1) * 100;
  return apy.toFixed(2);
}

export interface ProtocolRate {
  protocol: string;
  asset: string;
  supplyApyPct: string;
  tvlUsd: string;
  executionStatus: "supported_now" | "mocked_only";
  liquidityProfile: "high" | "medium" | "low";
  notes: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export async function fetchRealProtocolRates(): Promise<ProtocolRate[]> {
  const client = createBaseMainnetClient();
  const rates: ProtocolRate[] = [];

  const results = await Promise.allSettled([
    fetchAaveRates(client),
    fetchCompoundV3Rates(client),
    fetchMoonwellRates(client),
  ]);

  for (const result of results) {
    if (result.status === "fulfilled") {
      rates.push(...result.value);
    } else {
      console.error("Failed to fetch protocol rates:", result.reason);
    }
  }

  return rates;
}

async function fetchAaveRates(client: ReturnType<typeof createBaseMainnetClient>): Promise<ProtocolRate[]> {
  const rates: ProtocolRate[] = [];

  const [wethReserve, cbBtcReserve] = await Promise.all([
    client.readContract({
      address: AAVE_V3_POOL,
      abi: aavePoolAbi,
      functionName: "getReserveData",
      args: [WETH],
    }),
    client.readContract({
      address: AAVE_V3_POOL,
      abi: aavePoolAbi,
      functionName: "getReserveData",
      args: [cbBTC],
    }),
  ]);

  const wethApy = rayToApy(wethReserve.currentLiquidityRate);
  const cbBtcApy = rayToApy(cbBtcReserve.currentLiquidityRate);

  rates.push({
    protocol: "Aave V3",
    asset: "WETH",
    supplyApyPct: wethApy,
    tvlUsd: "500M+",
    executionStatus: "supported_now",
    liquidityProfile: "high",
    notes: "Largest lending protocol. Deep liquidity, battle-tested. Preferred for WETH and cbBTC supply.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/40",
  });

  rates.push({
    protocol: "Aave V3",
    asset: "cbBTC",
    supplyApyPct: cbBtcApy,
    tvlUsd: "500M+",
    executionStatus: "supported_now",
    liquidityProfile: "high",
    notes: "Aave cbBTC market. Coinbase-wrapped BTC is the canonical BTC asset on Base.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/40",
  });

  return rates;
}

async function fetchCompoundV3Rates(client: ReturnType<typeof createBaseMainnetClient>): Promise<ProtocolRate[]> {
  const rates: ProtocolRate[] = [];

  const utilization = await client.readContract({
    address: COMPOUND_V3_WETH,
    abi: cometAbi,
    functionName: "getUtilization",
  });

  const supplyRate = await client.readContract({
    address: COMPOUND_V3_WETH,
    abi: cometAbi,
    functionName: "getSupplyRate",
    args: [utilization],
  });

  const wethApy = compoundRateToApy(supplyRate);

  rates.push({
    protocol: "Compound V3",
    asset: "WETH",
    supplyApyPct: wethApy,
    tvlUsd: "200M+",
    executionStatus: "supported_now",
    liquidityProfile: "high",
    notes: "Compound III WETH market. Battle-tested protocol with audited smart contracts.",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/40",
  });

  return rates;
}

async function fetchMoonwellRates(client: ReturnType<typeof createBaseMainnetClient>): Promise<ProtocolRate[]> {
  const rates: ProtocolRate[] = [];

  const [wethRatePerBlock, cbBtcRatePerBlock] = await Promise.all([
    client.readContract({
      address: MOONWELL_WETH,
      abi: moonwellMarketAbi,
      functionName: "supplyRatePerBlock",
    }),
    client.readContract({
      address: MOONWELL_cbBTC,
      abi: moonwellMarketAbi,
      functionName: "supplyRatePerBlock",
    }),
  ]);

  const wethApy = moonwellRateToApy(wethRatePerBlock);
  const cbBtcApy = moonwellRateToApy(cbBtcRatePerBlock);

  rates.push({
    protocol: "Moonwell",
    asset: "WETH",
    supplyApyPct: wethApy,
    tvlUsd: "70M+",
    executionStatus: "supported_now",
    liquidityProfile: "medium",
    notes: "Moonwell WETH market. Compound V2 fork, audited by Certik and Trail of Bits. Base-native protocol.",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/40",
  });

  rates.push({
    protocol: "Moonwell",
    asset: "cbBTC",
    supplyApyPct: cbBtcApy,
    tvlUsd: "70M+",
    executionStatus: "supported_now",
    liquidityProfile: "medium",
    notes: "Moonwell cbBTC market. Often competitive yields on Base-native assets.",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/40",
  });

  return rates;
}

export function getFallbackRates(): ProtocolRate[] {
  return [
    {
      protocol: "Aave V3",
      asset: "WETH",
      supplyApyPct: "3.80",
      tvlUsd: "500M+",
      executionStatus: "supported_now",
      liquidityProfile: "high",
      notes: "Fallback rate. Largest lending protocol on Base.",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/40",
    },
    {
      protocol: "Aave V3",
      asset: "cbBTC",
      supplyApyPct: "2.10",
      tvlUsd: "500M+",
      executionStatus: "supported_now",
      liquidityProfile: "high",
      notes: "Fallback rate. Aave cbBTC market.",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/40",
    },
    {
      protocol: "Compound V3",
      asset: "WETH",
      supplyApyPct: "3.20",
      tvlUsd: "200M+",
      executionStatus: "supported_now",
      liquidityProfile: "high",
      notes: "Fallback rate. Compound III WETH market.",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/40",
    },
    {
      protocol: "Moonwell",
      asset: "WETH",
      supplyApyPct: "4.50",
      tvlUsd: "70M+",
      executionStatus: "supported_now",
      liquidityProfile: "medium",
      notes: "Fallback rate. Moonwell WETH market.",
      color: "text-violet-400",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-500/40",
    },
    {
      protocol: "Moonwell",
      asset: "cbBTC",
      supplyApyPct: "2.80",
      tvlUsd: "70M+",
      executionStatus: "supported_now",
      liquidityProfile: "medium",
      notes: "Fallback rate. Moonwell cbBTC market.",
      color: "text-violet-400",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-500/40",
    },
  ];
}

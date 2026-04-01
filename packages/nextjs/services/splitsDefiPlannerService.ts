import OpenAI from "openai";
import { z } from "zod";
import { type ProtocolRate, fetchRealProtocolRates, getFallbackRates } from "~~/services/baseDefiRatesService";

const AllocationActionSchema = z.object({
  venue: z.string(),
  asset: z.string(),
  amount: z.string(),
  apyPct: z.string(),
});

const SplitsDefiPlanSchema = z.object({
  allocations: z.array(AllocationActionSchema),
  totalProjectedYieldUsd: z.string(),
  reasoning: z.string(),
});

export type SplitsDefiAllocation = z.infer<typeof AllocationActionSchema>;
export type SplitsDefiPlan = z.infer<typeof SplitsDefiPlanSchema>;

export interface SplitsDefiSnapshot {
  walletTokens: Array<{
    symbol: string;
    balance: string;
    usdValue: string;
  }>;
  candidateVenues: Array<{
    id: string;
    label: string;
    supplyApyPct: string;
    asset: string;
    liquidityProfile: "high" | "medium" | "low";
    executionStatus: "supported_now" | "mocked_only";
    notes: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }>;
  totalUsdValue: string;
  ratesSource: "live" | "fallback";
}

const SYSTEM_PROMPT = `You are SplitHub's DeFi allocation planner for the Splits surface.
You analyze a wallet snapshot holding WETH and cbBTC on Base and produce an optimal yield allocation across real DeFi protocols.

Rules:
- Only allocate to venues that appear in candidateVenues with "supported_now" executionStatus.
- Diversify across protocols for risk management — do not put everything in one venue unless others are clearly inferior.
- Consider APY, liquidity profile, and TVL when choosing allocations.
- Do not invent venues — only use the candidateVenues provided.
- Return valid JSON matching the exact schema requested.
- Keep reasoning concise (2-3 sentences).
- APY values come directly from on-chain reads of the candidateVenues — use them exactly as provided.
- Amounts should reflect a reasonable split considering risk diversification.
- cbBTC (Coinbase Wrapped BTC) is the canonical BTC asset on Base — treat it like WBTC.
- All rates are real-time on-chain supply APYs fetched from Aave V3, Compound V3, and Moonwell on Base mainnet.`;

const planJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    allocations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          venue: { type: "string" },
          asset: { type: "string" },
          amount: { type: "string" },
          apyPct: { type: "string" },
        },
        required: ["venue", "asset", "amount", "apyPct"],
      },
    },
    totalProjectedYieldUsd: { type: "string" },
    reasoning: { type: "string" },
  },
  required: ["allocations", "totalProjectedYieldUsd", "reasoning"],
} as const;

function protocolRateToVenue(rate: ProtocolRate): SplitsDefiSnapshot["candidateVenues"][number] {
  return {
    id: rate.protocol.toLowerCase().replace(/\s+/g, "_"),
    label: rate.protocol,
    supplyApyPct: rate.supplyApyPct,
    asset: rate.asset,
    liquidityProfile: rate.liquidityProfile,
    executionStatus: rate.executionStatus,
    notes: rate.notes,
    color: rate.color,
    bgColor: rate.bgColor,
    borderColor: rate.borderColor,
  };
}

export function getMockSplitsDefiSnapshot(): SplitsDefiSnapshot {
  const fallbackRates = getFallbackRates();
  return {
    walletTokens: [
      { symbol: "WETH", balance: "2.5000", usdValue: "4875.00" },
      { symbol: "cbBTC", balance: "0.1500", usdValue: "12637.50" },
    ],
    candidateVenues: fallbackRates.map(protocolRateToVenue),
    totalUsdValue: "17512.50",
    ratesSource: "fallback",
  };
}

export async function buildSplitsDefiSnapshot(): Promise<SplitsDefiSnapshot> {
  let rates: ProtocolRate[];
  let ratesSource: "live" | "fallback" = "live";

  try {
    const liveRates = await fetchRealProtocolRates();
    if (liveRates.length > 0) {
      rates = liveRates;
    } else {
      rates = getFallbackRates();
      ratesSource = "fallback";
    }
  } catch {
    rates = getFallbackRates();
    ratesSource = "fallback";
  }

  return {
    walletTokens: [
      { symbol: "WETH", balance: "2.5000", usdValue: "4875.00" },
      { symbol: "cbBTC", balance: "0.1500", usdValue: "12637.50" },
    ],
    candidateVenues: rates.map(protocolRateToVenue),
    totalUsdValue: "17512.50",
    ratesSource,
  };
}

export function deterministicSplitsDefiPlan(snapshot: SplitsDefiSnapshot): SplitsDefiPlan {
  const weth = snapshot.walletTokens.find(t => t.symbol === "WETH");
  const cbBtc = snapshot.walletTokens.find(t => t.symbol === "cbBTC");

  const allocations: SplitsDefiAllocation[] = [];
  let totalWeightedApy = 0;
  let totalUsd = 0;

  const wethVenues = snapshot.candidateVenues
    .filter(v => v.asset === "WETH" && v.executionStatus === "supported_now")
    .sort((a, b) => parseFloat(b.supplyApyPct) - parseFloat(a.supplyApyPct));

  if (weth && wethVenues.length > 0) {
    const bestWeth = wethVenues[0];
    allocations.push({
      venue: bestWeth.label,
      asset: "WETH",
      amount: weth.balance,
      apyPct: bestWeth.supplyApyPct,
    });
    totalWeightedApy += parseFloat(weth.usdValue) * parseFloat(bestWeth.supplyApyPct);
    totalUsd += parseFloat(weth.usdValue);
  }

  const cbBtcVenues = snapshot.candidateVenues
    .filter(v => v.asset === "cbBTC" && v.executionStatus === "supported_now")
    .sort((a, b) => parseFloat(b.supplyApyPct) - parseFloat(a.supplyApyPct));

  if (cbBtc && cbBtcVenues.length > 0) {
    const bestCbBtc = cbBtcVenues[0];
    allocations.push({
      venue: bestCbBtc.label,
      asset: "cbBTC",
      amount: cbBtc.balance,
      apyPct: bestCbBtc.supplyApyPct,
    });
    totalWeightedApy += parseFloat(cbBtc.usdValue) * parseFloat(bestCbBtc.supplyApyPct);
    totalUsd += parseFloat(cbBtc.usdValue);
  }

  const avgApy = totalUsd > 0 ? totalWeightedApy / totalUsd : 0;
  const projectedDailyYield = (totalUsd * avgApy) / 100 / 365;

  return {
    allocations,
    totalProjectedYieldUsd: projectedDailyYield.toFixed(2),
    reasoning:
      "Deterministic fallback: allocating each asset to its highest-yielding venue on Base. " +
      `WETH → ${wethVenues[0]?.label ?? "N/A"}, cbBTC → ${cbBtcVenues[0]?.label ?? "N/A"}. ` +
      "Alternative venues are noted but not selected in the fallback path.",
  };
}

async function requestPlan(openai: OpenAI, input: string): Promise<SplitsDefiPlan> {
  const response = await openai.responses.create({
    model: "gpt-5.4-mini",
    input,
    text: {
      format: {
        type: "json_schema",
        name: "splits_defi_allocation_plan",
        strict: true,
        schema: planJsonSchema,
      },
    },
  });

  const textContent = response.output_text;
  if (!textContent) {
    throw new Error("Empty response from LLM");
  }

  return SplitsDefiPlanSchema.parse(JSON.parse(textContent));
}

export async function getSplitsDefiPlan(snapshot: SplitsDefiSnapshot): Promise<{
  plan: SplitsDefiPlan;
  source: "llm" | "fallback";
}> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { plan: deterministicSplitsDefiPlan(snapshot), source: "fallback" };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const plannerInput = { snapshot };

    let plan = await requestPlan(
      openai,
      `${SYSTEM_PROMPT}\n\nPlanning input:\n${JSON.stringify(plannerInput, null, 2)}`,
    );

    const validVenueIds = snapshot.candidateVenues.map(v => v.label);
    const hasInvalidVenue = plan.allocations.some(a => !validVenueIds.includes(a.venue));
    if (hasInvalidVenue) {
      plan = await requestPlan(
        openai,
        `${SYSTEM_PROMPT}

Your previous plan was invalid — it referenced a venue not in the candidate list.
Only use venues from: ${validVenueIds.join(", ")}

Planning input:
${JSON.stringify(plannerInput, null, 2)}`,
      );
    }

    return { plan, source: "llm" };
  } catch (error) {
    console.error("Splits DeFi planner error:", error);
    throw error;
  }
}

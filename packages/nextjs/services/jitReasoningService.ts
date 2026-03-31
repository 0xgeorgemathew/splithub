import OpenAI from "openai";
import { z } from "zod";
import type { DefiVenueCandidate } from "~~/services/defiVenueService";

const JitReasoningSchema = z.object({
  fundingSource: z.enum(["chip_balance", "agent_liquid", "aave_withdraw", "insufficient_backing"]),
  reasoning: z.string(),
});

export interface JitReasoningInput {
  tapAmountUsd: string;
  tapLimitUsd: string;
  chipWalletBalanceUsd: string;
  shortfallUsd: string;
  agentLiquidUsd: string;
  aaveReserveUsd: string;
  venues: DefiVenueCandidate[];
}

export interface JitReasoningResult {
  fundingSource: z.infer<typeof JitReasoningSchema>["fundingSource"];
  reasoning: string;
  source: "llm" | "fallback";
}

function getDeterministicFundingSource(input: JitReasoningInput): JitReasoningResult["fundingSource"] {
  const shortfall = Number.parseFloat(input.shortfallUsd);
  const agentLiquid = Number.parseFloat(input.agentLiquidUsd);
  const aaveReserve = Number.parseFloat(input.aaveReserveUsd);

  if (shortfall <= 0) return "chip_balance";
  if (shortfall <= agentLiquid) return "agent_liquid";
  if (shortfall <= agentLiquid + aaveReserve) return "aave_withdraw";
  return "insufficient_backing";
}

function getFallbackReasoning(input: JitReasoningInput, fundingSource: JitReasoningResult["fundingSource"]) {
  const venueSummary = input.venues
    .filter(venue => venue.id !== "aave")
    .map(venue => `${venue.label} is mocked as unattractive at ${venue.mockedApyPct}% APY`)
    .join(", ");

  if (fundingSource === "chip_balance") {
    return `The chip wallet already covers this tap, so no additional funding is needed. Aave remains the preferred reserve venue while ${venueSummary}.`;
  }

  if (fundingSource === "agent_liquid") {
    return `This tap can be covered from the agent wallet's liquid reserve without touching Aave. Aave stays as the primary reserve venue because ${venueSummary}.`;
  }

  if (fundingSource === "aave_withdraw") {
    return `This tap needs a just-in-time top-up, so the agent should withdraw the shortfall from Aave and fund the chip wallet. Aave remains preferred because ${venueSummary}.`;
  }

  return `Vincent backing is insufficient for this tap. Even so, Aave remains the only preferred reserve venue because ${venueSummary}.`;
}

export async function generateJitFundingReasoning(input: JitReasoningInput): Promise<JitReasoningResult> {
  const fundingSource = getDeterministicFundingSource(input);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      fundingSource,
      reasoning: getFallbackReasoning(input, fundingSource),
      source: "fallback",
    };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: `You are SplitHub's JIT payment planner.

You must explain only the already-determined funding path.

Funding source selected by policy: ${fundingSource}

Rules:
- This is a tap payment and reliability matters more than experimentation.
- Aave is the currently supported reserve venue.
- Morpho Blue, Compound V3, and Balancer are mock alternatives only.
- Their mocked APYs/outlooks should be treated as unattractive and you should say why they are rejected.
- Do not recommend any venue other than Aave for execution right now.
- If the funding source is chip_balance, explain why no top-up is needed.
- If the funding source is agent_liquid, explain why the liquid reserve is enough.
- If the funding source is aave_withdraw, explain why a just-in-time Aave withdraw is appropriate.
- If the funding source is insufficient_backing, explain why the payment cannot be funded safely.
- Keep the reasoning concise and user-facing.

Input:
${JSON.stringify(input, null, 2)}`,
      text: {
        format: {
          type: "json_schema",
          name: "jit_reasoning",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              fundingSource: {
                type: "string",
                enum: ["chip_balance", "agent_liquid", "aave_withdraw", "insufficient_backing"],
              },
              reasoning: { type: "string" },
            },
            required: ["fundingSource", "reasoning"],
          },
        },
      },
    });

    const output = response.output_text;
    if (!output) {
      throw new Error("Empty response from LLM");
    }

    const parsed = JitReasoningSchema.parse(JSON.parse(output));
    return {
      fundingSource,
      reasoning: parsed.reasoning,
      source: "llm",
    };
  } catch {
    return {
      fundingSource,
      reasoning: getFallbackReasoning(input, fundingSource),
      source: "fallback",
    };
  }
}

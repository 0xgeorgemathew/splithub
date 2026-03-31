import OpenAI from "openai";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ActionSchema = z.object({
  type: z.enum(["no_action", "fund_agent_wallet", "aave_supply", "aave_withdraw"]),
  asset: z.literal("USDC"),
  amount: z.string(),
});

const PlanSchema = z.object({
  targetReserveUsd: z.string(),
  actions: z.array(ActionSchema),
  reasoning: z.string(),
});

export type ValidatedPlan = z.infer<typeof PlanSchema>;

export interface PlannerSnapshot {
  privyWallet: {
    tokens: { symbol: string; balance: string; usdValue: string }[];
  };
  agentWallet: {
    liquidUsdc: string;
    aaveSuppliedUsdc: string;
    availableToWithdrawUsdc: string;
  };
  spendProfile: {
    pendingRequestsUsd: string;
    sevenDayMedianSpendUsd: string;
    maxSingleExpectedSpendUsd: string;
  };
  policyBounds: {
    minReserveUsd: string;
    maxDailyDeploymentUsd: string;
    supportedAssets: string[];
  };
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are SplitHub's capital allocation planner.
You do not trade, predict markets, or invent tools.
You only choose among allowed actions using the state provided.

Your job:
- keep the Vincent wallet as close to fully deployed as possible,
- do not preserve a standing liquid reserve in the Vincent wallet,
- deploy idle reserve balance into Aave,
- minimize unnecessary movement,
- explain the decision briefly.

You must obey:
- Base network only,
- only the supported reserve asset,
- no swaps,
- no borrow,
- no repay,
- no unsupported assets,
- no action above maxDailyDeploymentUsd.

For the "Open Position" flow:
- you may use Privy wallet balance as the funding source,
- you may return both fund_agent_wallet and aave_supply,
- fund only what you intend to deploy,
- if deployable capital exists in the Vincent wallet or Privy wallet, prefer deploying it instead of returning no_action.

For reasoning text:
- refer to "liquid reserve", "agent wallet", and "Aave position",
- avoid relying on token ticker names unless they are explicitly provided in supportedAssets.

Return valid JSON only.
If no safe action exists, return a no_action plan with asset set to USDC and amount set to "0".`;

const planJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    targetReserveUsd: { type: "string" },
    reasoning: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: {
            type: "string",
            enum: ["no_action", "fund_agent_wallet", "aave_supply", "aave_withdraw"],
          },
          asset: { type: "string", enum: ["USDC"] },
          amount: { type: "string" },
        },
        required: ["type", "asset", "amount"],
      },
    },
  },
  required: ["targetReserveUsd", "actions", "reasoning"],
} as const;

// ---------------------------------------------------------------------------
// Deterministic fallback
// ---------------------------------------------------------------------------

export function deterministicPlan(snapshot: PlannerSnapshot): ValidatedPlan {
  const reserveFloor = parseFloat(snapshot.policyBounds.minReserveUsd);
  const maxDaily = parseFloat(snapshot.policyBounds.maxDailyDeploymentUsd);
  const liquidUsdc = parseFloat(snapshot.agentWallet.liquidUsdc);
  const aaveSupplied = parseFloat(snapshot.agentWallet.aaveSuppliedUsdc);
  const privyUsdc = snapshot.privyWallet.tokens.find(t => t.symbol === "USDC");
  const privyUsdcBalance = privyUsdc ? parseFloat(privyUsdc.balance) : 0;
  const pending = parseFloat(snapshot.spendProfile.pendingRequestsUsd);

  const actions: ValidatedPlan["actions"] = [];

  // 1. If the reserve is below floor, fund the shortfall from Privy first.
  const totalDeployable = Math.max(0, liquidUsdc + privyUsdcBalance - reserveFloor);
  const targetSupply = Math.min(maxDaily, totalDeployable);
  const desiredFunding = Math.min(privyUsdcBalance, Math.max(0, reserveFloor + targetSupply - liquidUsdc));

  if (desiredFunding > 0) {
    const fundAmount = desiredFunding.toFixed(2);
    actions.push({ type: "fund_agent_wallet", asset: "USDC", amount: fundAmount });
  }

  // 2. If there is deployable capital once funding is applied, supply it.
  const projectedLiquid = liquidUsdc + desiredFunding;
  const supplyAmount = Math.min(targetSupply, Math.max(0, projectedLiquid - reserveFloor));
  if (supplyAmount > 1 && aaveSupplied >= 0) {
    actions.push({ type: "aave_supply", asset: "USDC", amount: supplyAmount.toFixed(2) });
  }

  // 3. If pending payments exceed liquid + buffer, withdraw from Aave
  if (pending > liquidUsdc && aaveSupplied > 0) {
    const withdrawAmount = Math.min(pending - liquidUsdc, aaveSupplied).toFixed(2);
    actions.push({ type: "aave_withdraw", asset: "USDC", amount: withdrawAmount });
  }

  if (actions.length === 0) {
    actions.push({ type: "no_action", asset: "USDC", amount: "0" });
  }

  return {
    targetReserveUsd: reserveFloor.toFixed(2),
    actions,
    reasoning: "Deterministic fallback: no standing Vincent reserve, idle balance deployed to Aave.",
  };
}

// ---------------------------------------------------------------------------
// Validation layer
// ---------------------------------------------------------------------------

function validatePlan(plan: ValidatedPlan, snapshot: PlannerSnapshot): string | null {
  const reserveFloor = parseFloat(snapshot.policyBounds.minReserveUsd);
  const maxDaily = parseFloat(snapshot.policyBounds.maxDailyDeploymentUsd);
  const privyUsdc = snapshot.privyWallet.tokens.find(t => t.symbol === "USDC");
  const privyBalance = privyUsdc ? parseFloat(privyUsdc.balance) : 0;
  const liquidAgent = parseFloat(snapshot.agentWallet.liquidUsdc);
  const currentAaveSupplied = parseFloat(snapshot.agentWallet.aaveSuppliedUsdc);
  const aaveWithdrawable = parseFloat(snapshot.agentWallet.availableToWithdrawUsdc);
  const targetSupplyForOpenPosition = Math.min(maxDaily, Math.max(0, liquidAgent + privyBalance - reserveFloor));

  let projectedLiquid = liquidAgent;
  let totalDeployment = 0;
  const hasOnlyNoAction = plan.actions.every(action => action.type === "no_action");

  if (hasOnlyNoAction && targetSupplyForOpenPosition > 1 && currentAaveSupplied + 1 < targetSupplyForOpenPosition) {
    return `No action is invalid because ${targetSupplyForOpenPosition.toFixed(
      2,
    )} USDC is deployable for Open Position`;
  }

  for (const action of plan.actions) {
    if (action.type === "no_action") continue;

    const amount = parseFloat(action.amount);
    if (action.asset !== "USDC") return `Unsupported asset: ${action.asset}`;
    if (isNaN(amount) || amount < 0) return `Invalid amount: ${action.amount}`;
    if (amount <= 0) return `Invalid amount: ${action.amount}`;

    if (action.type === "fund_agent_wallet") {
      if (amount > privyBalance) return `Funding amount ${amount} exceeds Privy balance ${privyBalance}`;
      projectedLiquid += amount;
    } else if (action.type === "aave_supply") {
      totalDeployment += amount;
      projectedLiquid -= amount;
    } else if (action.type === "aave_withdraw") {
      if (amount > aaveWithdrawable) return `Withdraw ${amount} exceeds Aave available ${aaveWithdrawable}`;
      projectedLiquid += amount;
    }
  }

  if (totalDeployment > maxDaily) return `Total deployment ${totalDeployment} exceeds max daily ${maxDaily}`;
  if (projectedLiquid < parseFloat(plan.targetReserveUsd)) {
    return `Projected liquid ${projectedLiquid} below target reserve ${plan.targetReserveUsd}`;
  }
  if (parseFloat(plan.targetReserveUsd) < reserveFloor) {
    return `Target reserve ${plan.targetReserveUsd} below floor ${reserveFloor}`;
  }

  return null; // valid
}

function buildPlannerInput(snapshot: PlannerSnapshot) {
  const privyUsdc = snapshot.privyWallet.tokens.find(t => t.symbol === "USDC");
  const privyBalance = privyUsdc ? parseFloat(privyUsdc.balance) : 0;
  const liquidUsdc = parseFloat(snapshot.agentWallet.liquidUsdc);
  const aaveWithdrawable = parseFloat(snapshot.agentWallet.availableToWithdrawUsdc);
  const targetReserveUsd = parseFloat(snapshot.policyBounds.minReserveUsd);
  const maxDailyDeploymentUsd = parseFloat(snapshot.policyBounds.maxDailyDeploymentUsd);
  const reserveGap = Math.max(0, targetReserveUsd - liquidUsdc);
  const maxFundable = privyBalance;
  const maxWithdrawable = aaveWithdrawable;
  const maxSupplyWithoutFunding = Math.max(0, liquidUsdc - targetReserveUsd);
  const totalDeployableAcrossWallets = Math.max(0, liquidUsdc + privyBalance - targetReserveUsd);
  const targetSupplyForOpenPosition = Math.min(maxDailyDeploymentUsd, totalDeployableAcrossWallets);
  const fundingNeededForTargetSupply = Math.max(0, targetReserveUsd + targetSupplyForOpenPosition - liquidUsdc);

  return {
    snapshot,
    derivedConstraints: {
      targetReserveUsd: targetReserveUsd.toFixed(2),
      maxDailyDeploymentUsd: maxDailyDeploymentUsd.toFixed(2),
      currentLiquidUsdc: liquidUsdc.toFixed(2),
      currentPrivyUsdc: privyBalance.toFixed(2),
      currentAaveWithdrawableUsdc: maxWithdrawable.toFixed(2),
      reserveGapUsd: reserveGap.toFixed(2),
      maxFundableUsdc: maxFundable.toFixed(2),
      maxWithdrawableUsdc: maxWithdrawable.toFixed(2),
      maxSupplyWithoutFundingUsdc: maxSupplyWithoutFunding.toFixed(2),
      totalDeployableAcrossWalletsUsd: totalDeployableAcrossWallets.toFixed(2),
      targetSupplyForOpenPositionUsd: targetSupplyForOpenPosition.toFixed(2),
      fundingNeededForTargetSupplyUsd: Math.min(maxFundable, fundingNeededForTargetSupply).toFixed(2),
    },
    executionRules: [
      "Simulate actions in order.",
      "fund_agent_wallet cannot exceed maxFundableUsdc.",
      "aave_withdraw cannot exceed maxWithdrawableUsdc.",
      "aave_supply cannot exceed targetSupplyForOpenPositionUsd.",
      "If there is deployable capital in Privy, you may fund first and then supply.",
      "If no action is needed, return one no_action item with asset USDC and amount 0.",
    ],
  };
}

async function requestPlan(openai: OpenAI, input: string): Promise<ValidatedPlan> {
  const response = await openai.responses.create({
    model: "gpt-5.4-mini",
    input,
    text: {
      format: {
        type: "json_schema",
        name: "capital_allocation_plan",
        strict: true,
        schema: planJsonSchema,
      },
    },
  });

  const textContent = response.output_text;
  if (!textContent) {
    throw new Error("Empty response from LLM");
  }

  return PlanSchema.parse(JSON.parse(textContent));
}

// ---------------------------------------------------------------------------
// Main planner function
// ---------------------------------------------------------------------------

export async function getCapitalAllocationPlan(snapshot: PlannerSnapshot): Promise<{
  plan: ValidatedPlan;
  source: "llm" | "fallback";
}> {
  const apiKey = process.env.OPENAI_API_KEY;

  // If no API key, fall back immediately
  if (!apiKey) {
    return { plan: deterministicPlan(snapshot), source: "fallback" };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const plannerInput = buildPlannerInput(snapshot);

    let plan = await requestPlan(
      openai,
      `${SYSTEM_PROMPT}\n\nPlanning input:\n${JSON.stringify(plannerInput, null, 2)}`,
    );

    let validationError = validatePlan(plan, snapshot);
    if (validationError) {
      plan = await requestPlan(
        openai,
        `${SYSTEM_PROMPT}

Your previous plan was invalid.
Validation error: ${validationError}

Return a corrected plan that satisfies all numeric limits exactly.

Planning input:
${JSON.stringify(plannerInput, null, 2)}`,
      );
      validationError = validatePlan(plan, snapshot);
    }

    if (validationError) {
      throw new Error(`LLM plan validation failed after retry: ${validationError}`);
    }

    return { plan, source: "llm" };
  } catch (error) {
    console.error("LLM planner error:", error);
    throw error;
  }
}

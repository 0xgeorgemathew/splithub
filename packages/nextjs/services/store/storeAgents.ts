import { ensureUserExists } from "../userService";
import {
  createSlug,
  findOrCreateNetwork,
  getStoreRecordById,
  normalizeAddress,
  resolveManager,
  resolveStoreOperatorWallet,
} from "./shared";
import { getStoreAnalytics } from "./storeAnalytics";
import { upsertStoreInventory } from "./storeCatalog";
import { getManagerAgentByStore, getStoreItems } from "./storeQueries";
import { ensureTrustAgentsForManager, getStoreTrustSnapshot, processCompletedManagerRun } from "./storeTrust";
import type { Stall } from "~~/lib/events.types";
import type { CreateStoreInput, StoreAnalytics, StoreTrustSnapshot } from "~~/lib/store.types";
import type { AgentRun, AgentValidation, ManagerAgent, ReputationEventRecord } from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

export async function createStore(
  input: CreateStoreInput,
): Promise<{ network: Awaited<ReturnType<typeof findOrCreateNetwork>>; store: Stall; agent: ManagerAgent }> {
  const network = await findOrCreateNetwork(input.adminWallet, input.networkName, input.networkSlug);
  const operatorWallet = resolveStoreOperatorWallet();
  const manager = await resolveManager({ ...input, managerWallet: operatorWallet });

  const { data: store, error } = await supabase
    .from("stalls")
    .insert({
      event_id: network.id,
      stall_name: input.storeName.trim(),
      stall_slug: createSlug(input.storeSlug || input.storeName),
      stall_description: input.storeDescription || null,
      operator_twitter_handle: manager?.twitter_handle || input.managerTwitterHandle?.replace(/^@/, "") || "unassigned",
      operator_wallet: operatorWallet,
      split_percentage: input.splitPercentage ?? 80,
      status: "active",
      token_address: input.tokenAddress.toLowerCase(),
    })
    .select("*")
    .single();

  if (error || !store) {
    throw new Error(`Failed to create store: ${error?.message}`);
  }

  const agent = await createManagerAgent({
    stallId: store.id,
    operatorWallet,
    agentName: input.agentName || `${input.storeName} AI Manager`,
  });

  return { network, store: store as Stall, agent };
}

export async function createManagerAgent({
  stallId,
  operatorWallet,
  agentName,
}: {
  stallId: number;
  operatorWallet: string;
  agentName: string;
}): Promise<ManagerAgent> {
  const normalizedWallet = normalizeAddress(operatorWallet);
  await ensureUserExists(normalizedWallet);

  const { data: existing } = await supabase.from("manager_agents").select("*").eq("stall_id", stallId).single();
  if (existing) {
    return existing as ManagerAgent;
  }

  const { data, error } = await supabase
    .from("manager_agents")
    .insert({
      stall_id: stallId,
      agent_name: agentName,
      operator_wallet: normalizedWallet,
      erc8004_agent_id: null,
      agent_address: null,
      status: "active",
      budget_daily_calls: 24,
      budget_daily_tokens: 15000,
      max_restock_value: 250,
      max_price_change_pct: 10,
      min_confidence: 0.72,
      allowed_supplier_urls: [],
      allowed_skus: [],
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create manager agent: ${error?.message}`);
  }

  try {
    await ensureTrustAgentsForManager(data as ManagerAgent);
  } catch (trustError) {
    console.error("Failed to prepare ERC-8004 trust agents:", trustError);
  }

  return data as ManagerAgent;
}

export async function createManagerAgentForStore(stallId: number): Promise<ManagerAgent> {
  const storeRecord = await getStoreRecordById(stallId);
  const operatorWallet = storeRecord.operator_wallet || storeRecord.event?.owner_wallet;

  if (!operatorWallet) {
    throw new Error("Store does not have an operator or admin wallet to link to an agent");
  }

  return createManagerAgent({
    stallId,
    operatorWallet,
    agentName: `${storeRecord.stall_name} AI Manager`,
  });
}

export async function pauseManagerAgent(
  stallId: number,
  status: ManagerAgent["status"] = "paused",
): Promise<ManagerAgent> {
  const { data, error } = await supabase
    .from("manager_agents")
    .update({ status })
    .eq("stall_id", stallId)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Failed to update manager agent: ${error?.message}`);
  }
  return data as ManagerAgent;
}

export async function createAgentRun(params: {
  agentId: string;
  runType: string;
  triggerSource: string;
  state?: AgentRun["state"];
  decisionSummary?: string | null;
  toolCalls?: Record<string, any>[];
  retries?: number;
  failures?: Record<string, any>[];
  output?: Record<string, any>;
  computeCostEstimate?: number;
}): Promise<AgentRun> {
  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      agent_id: params.agentId,
      run_type: params.runType,
      trigger_source: params.triggerSource,
      state: params.state || "discovering",
      decision_summary: params.decisionSummary || null,
      tool_calls_json: params.toolCalls || [],
      retries: params.retries || 0,
      failures_json: params.failures || [],
      output_json: params.output || {},
      compute_cost_estimate: params.computeCostEstimate || 0,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create agent run: ${error?.message}`);
  }

  return data as AgentRun;
}

export async function updateAgentRun(
  runId: string,
  updates: Partial<{
    state: AgentRun["state"];
    decisionSummary: string | null;
    toolCalls: Record<string, any>[];
    retries: number;
    failures: Record<string, any>[];
    output: Record<string, any>;
    computeCostEstimate: number;
    completedAt: string | null;
  }>,
): Promise<AgentRun> {
  const payload: Record<string, any> = {};
  if (updates.state !== undefined) payload.state = updates.state;
  if (updates.decisionSummary !== undefined) payload.decision_summary = updates.decisionSummary;
  if (updates.toolCalls !== undefined) payload.tool_calls_json = updates.toolCalls;
  if (updates.retries !== undefined) payload.retries = updates.retries;
  if (updates.failures !== undefined) payload.failures_json = updates.failures;
  if (updates.output !== undefined) payload.output_json = updates.output;
  if (updates.computeCostEstimate !== undefined) payload.compute_cost_estimate = updates.computeCostEstimate;
  if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;

  const { data, error } = await supabase.from("agent_runs").update(payload).eq("id", runId).select("*").single();
  if (error || !data) {
    throw new Error(`Failed to update agent run: ${error?.message}`);
  }
  return data as AgentRun;
}

export async function createAgentValidation(params: {
  agentRunId: string;
  validationTx?: string | null;
  status?: AgentValidation["status"];
  evidenceUri?: string | null;
}): Promise<AgentValidation> {
  const { data, error } = await supabase
    .from("agent_validations")
    .insert({
      agent_run_id: params.agentRunId,
      erc8004_validation_tx: params.validationTx || null,
      status: params.status || "pending",
      evidence_uri: params.evidenceUri || null,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create agent validation: ${error?.message}`);
  }
  return data as AgentValidation;
}

export async function getAgentLogs(agentId: string): Promise<{
  runs: AgentRun[];
  validations: AgentValidation[];
  trust: StoreTrustSnapshot | null;
  reputationEvents: ReputationEventRecord[];
}> {
  const { data: runs, error } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("agent_id", agentId)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch agent runs: ${error.message}`);
  }

  const runIds = (runs || []).map(run => run.id);
  const validations = runIds.length
    ? (((await supabase.from("agent_validations").select("*").in("agent_run_id", runIds)).data ||
        []) as AgentValidation[])
    : [];
  const trust = await getStoreTrustSnapshot(agentId).catch(() => null);

  return {
    runs: (runs || []) as AgentRun[],
    validations,
    trust,
    reputationEvents: trust?.reputationEvents || [],
  };
}

export async function executeAutonomousStoreRun(
  stallId: number,
  triggerSource: string,
): Promise<{
  agent: ManagerAgent;
  run: AgentRun;
  actions: Record<string, any>[];
  analytics: StoreAnalytics;
}> {
  if (process.env.OPENAI_API_KEY) {
    const { executeOpenAIStoreAgentRun } = await import("./storeAgentRuntime");
    return executeOpenAIStoreAgentRun(stallId, triggerSource);
  }

  return executeRuleBasedStoreRun(stallId, triggerSource);
}

export async function executeRuleBasedStoreRun(
  stallId: number,
  triggerSource: string,
): Promise<{
  agent: ManagerAgent;
  run: AgentRun;
  actions: Record<string, any>[];
  analytics: StoreAnalytics;
}> {
  const agent = await getManagerAgentByStore(stallId);
  if (!agent) {
    throw new Error("Store agent not configured");
  }
  if (agent.status !== "active") {
    throw new Error("Store agent is paused");
  }

  const analytics = await getStoreAnalytics(stallId);
  const items = await getStoreItems(stallId);
  const lowStockItems = items.filter(item => {
    const inventory = item.inventory;
    return inventory && inventory.current_stock <= inventory.reorder_threshold && item.status !== "archived";
  });
  const policy = {
    budgetDailyCalls: agent.budget_daily_calls,
    budgetDailyTokens: agent.budget_daily_tokens,
    maxRestockValue: agent.max_restock_value,
    maxPriceChangePct: agent.max_price_change_pct,
    minConfidence: agent.min_confidence,
    allowedSkus: agent.allowed_skus || [],
  };

  const actions: Record<string, any>[] = [];
  const failures: Record<string, any>[] = [];

  const run = await createAgentRun({
    agentId: agent.id,
    runType: "autonomous_store_scan",
    triggerSource,
    state: "discovering",
    toolCalls: [
      { tool: "getStoreAnalytics", stallId },
      { tool: "getStoreItems", stallId },
    ],
    decisionSummary: `Discovered ${lowStockItems.length} low-stock items and ${analytics.failedOrders} failed orders.`,
    computeCostEstimate: Math.min(agent.budget_daily_tokens, 1200),
  });

  try {
    await updateAgentRun(run.id, {
      state: "planning",
      toolCalls: [...run.tool_calls_json, { tool: "planActions", lowStockItems: lowStockItems.length }],
    });

    for (const item of lowStockItems) {
      const inventory = item.inventory;
      if (!inventory) continue;
      const unitsToRestock = Math.max(inventory.target_stock - inventory.current_stock, 0);
      if (unitsToRestock === 0) continue;

      const estimatedValue = unitsToRestock * item.price;
      if (estimatedValue > agent.max_restock_value) {
        failures.push({
          type: "budget_guardrail",
          itemId: item.id,
          sku: item.sku,
          estimatedValue,
          maxRestockValue: agent.max_restock_value,
        });
        actions.push({
          type: "skip_restock",
          itemId: item.id,
          reason: "restock_budget_exceeded",
          estimatedValue,
        });
        continue;
      }

      const nextStock = inventory.target_stock;
      await upsertStoreInventory(item.id, {
        currentStock: nextStock,
        reorderThreshold: inventory.reorder_threshold,
        targetStock: inventory.target_stock,
        lastRestockedAt: new Date().toISOString(),
      });

      actions.push({
        type: "restock_item",
        itemId: item.id,
        sku: item.sku,
        previousStock: inventory.current_stock,
        newStock: nextStock,
        estimatedValue,
      });
    }

    const finalState: AgentRun["state"] = failures.length > 0 && actions.length === 0 ? "failed" : "submitted";
    const updatedRun = await updateAgentRun(run.id, {
      state: finalState,
      decisionSummary:
        actions.length > 0
          ? `Executed ${actions.length} autonomous store actions.`
          : "No safe autonomous actions were available within current guardrails.",
      toolCalls: [...run.tool_calls_json, { tool: "restockItems", count: actions.length }],
      failures,
      output: {
        inputState: {
          analytics,
          items: items.map(item => ({
            itemId: item.id,
            sku: item.sku,
            name: item.name,
            status: item.status,
            price: item.price,
            stock: item.inventory?.current_stock ?? 0,
            reorderThreshold: item.inventory?.reorder_threshold ?? 0,
            targetStock: item.inventory?.target_stock ?? 0,
          })),
          policy,
        },
        analytics,
        actions,
      },
      completedAt: new Date().toISOString(),
    });

    await createAgentValidation({
      agentRunId: updatedRun.id,
      status: "pending",
      evidenceUri: `/api/agents/${agent.id}/logs`,
    });

    try {
      await processCompletedManagerRun(updatedRun.id);
    } catch (trustError) {
      console.error("Failed to process ERC-8004 trust flow:", trustError);
    }

    return {
      agent,
      run: updatedRun,
      actions,
      analytics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autonomous run failed";
    const failedRun = await updateAgentRun(run.id, {
      state: "failed",
      failures: [...failures, { type: "runtime_error", message }],
      output: {
        analytics,
        actions,
      },
      completedAt: new Date().toISOString(),
    });
    throw new Error(`Agent run failed: ${failedRun.id}: ${message}`);
  }
}

import { createAgentRun, createAgentValidation, updateAgentRun } from "./storeAgents";
import { getStoreAnalytics } from "./storeAnalytics";
import { upsertStoreInventory } from "./storeCatalog";
import { getManagerAgentByStore, getStoreItems } from "./storeQueries";
import OpenAI from "openai";
import type { FunctionTool } from "openai/resources/responses/responses";
import type { StoreAnalytics } from "~~/lib/store.types";
import type { AgentRun, ManagerAgent } from "~~/lib/supabase";

const DEFAULT_OPENAI_STORE_AGENT_MODEL = process.env.OPENAI_STORE_AGENT_MODEL || "gpt-5.4-mini";
const MAX_AGENT_TURNS = 4;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

type AgentAction = Record<string, any>;
type AgentFailure = Record<string, any>;
type ToolNote = {
  summary?: string;
};

type StoreAgentRunResult = {
  agent: ManagerAgent;
  run: AgentRun;
  actions: AgentAction[];
  analytics: StoreAnalytics;
};

function buildStoreStateSnapshot(items: Awaited<ReturnType<typeof getStoreItems>>) {
  return items.map(item => ({
    itemId: item.id,
    sku: item.sku,
    name: item.name,
    status: item.status,
    price: item.price,
    stock: item.inventory?.current_stock ?? 0,
    reorderThreshold: item.inventory?.reorder_threshold ?? 0,
    targetStock: item.inventory?.target_stock ?? 0,
  }));
}

function buildAgentInstructions(agent: ManagerAgent) {
  return [
    "You are an autonomous AI store manager for SplitHub.",
    "Operate as a cautious retail ops agent that discovers issues, plans safe actions, executes only through tools, verifies results, and submits a concise summary.",
    "Prefer doing nothing over making an unsafe or low-confidence action.",
    `You may only restock when confidence is at least ${agent.min_confidence}.`,
    `Never exceed a per-item restock value above ${agent.max_restock_value}.`,
    "Use get_store_state and get_store_analytics before taking actions if you need fresh data.",
    "Use record_agent_log before finishing to store a short operator-facing summary.",
    "When there are no safe actions available, say so clearly.",
  ].join(" ");
}

function buildOpenAITools(): FunctionTool[] {
  return [
    {
      type: "function",
      name: "get_store_state",
      description: "Fetch the current catalog and inventory state for this store.",
      strict: true,
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
        required: [],
      },
    },
    {
      type: "function",
      name: "get_store_analytics",
      description: "Fetch current store analytics such as low stock and failed order counts.",
      strict: true,
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
        required: [],
      },
    },
    {
      type: "function",
      name: "restock_items",
      description: "Restock one or more items up to a safe target stock level within guardrails.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                itemId: { type: "integer" },
                targetStock: { type: "integer" },
                reason: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["itemId", "targetStock", "reason", "confidence"],
              additionalProperties: false,
            },
          },
        },
        required: ["items"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "record_agent_log",
      description: "Store a concise operator-facing summary before the run is finalized.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
        },
        required: ["summary"],
        additionalProperties: false,
      },
    },
  ];
}

async function executeStoreTool(params: {
  name: string;
  argumentsJson: string;
  stallId: number;
  agent: ManagerAgent;
  latestItems: Awaited<ReturnType<typeof getStoreItems>>;
  analytics: StoreAnalytics;
  actions: AgentAction[];
  failures: AgentFailure[];
  toolNotes: ToolNote;
}) {
  const parsedArgs = params.argumentsJson ? JSON.parse(params.argumentsJson) : {};

  switch (params.name) {
    case "get_store_state":
      return {
        items: buildStoreStateSnapshot(params.latestItems),
      };

    case "get_store_analytics":
      return params.analytics;

    case "record_agent_log":
      params.toolNotes.summary = parsedArgs.summary;
      return { stored: true };

    case "restock_items": {
      const results = [];

      for (const candidate of parsedArgs.items || []) {
        const item = params.latestItems.find(entry => entry.id === Number(candidate.itemId));
        const inventory = item?.inventory;

        if (!item || !inventory) {
          const failure = {
            type: "missing_item",
            itemId: candidate.itemId,
            reason: "Item or inventory record not found",
          };
          params.failures.push(failure);
          results.push({ ok: false, ...failure });
          continue;
        }

        if (item.status === "archived") {
          const failure = {
            type: "archived_item",
            itemId: item.id,
            sku: item.sku,
            reason: "Archived items cannot be restocked",
          };
          params.failures.push(failure);
          results.push({ ok: false, ...failure });
          continue;
        }

        if (candidate.confidence < params.agent.min_confidence) {
          const failure = {
            type: "confidence_guardrail",
            itemId: item.id,
            sku: item.sku,
            confidence: candidate.confidence,
            minConfidence: params.agent.min_confidence,
          };
          params.failures.push(failure);
          results.push({ ok: false, ...failure });
          continue;
        }

        if (params.agent.allowed_skus?.length && !params.agent.allowed_skus.includes(item.sku)) {
          const failure = {
            type: "sku_guardrail",
            itemId: item.id,
            sku: item.sku,
            reason: "SKU is not on the allowed list",
          };
          params.failures.push(failure);
          results.push({ ok: false, ...failure });
          continue;
        }

        const safeTargetStock = Math.min(
          Math.max(Number(candidate.targetStock), inventory.current_stock),
          inventory.target_stock,
        );
        const unitsToRestock = Math.max(safeTargetStock - inventory.current_stock, 0);

        if (unitsToRestock === 0) {
          results.push({
            ok: true,
            itemId: item.id,
            sku: item.sku,
            action: "noop",
            reason: "Already at or above requested stock",
          });
          continue;
        }

        const estimatedValue = unitsToRestock * item.price;
        if (estimatedValue > params.agent.max_restock_value) {
          const failure = {
            type: "budget_guardrail",
            itemId: item.id,
            sku: item.sku,
            estimatedValue,
            maxRestockValue: params.agent.max_restock_value,
          };
          params.failures.push(failure);
          results.push({ ok: false, ...failure });
          continue;
        }

        await upsertStoreInventory(item.id, {
          currentStock: safeTargetStock,
          reorderThreshold: inventory.reorder_threshold,
          targetStock: inventory.target_stock,
          lastRestockedAt: new Date().toISOString(),
        });

        const action = {
          type: "restock_item",
          itemId: item.id,
          sku: item.sku,
          previousStock: inventory.current_stock,
          newStock: safeTargetStock,
          estimatedValue,
          reason: candidate.reason,
          confidence: candidate.confidence,
          tool: "restock_items",
        };

        params.actions.push(action);
        results.push({ ok: true, ...action });
      }

      return { results };
    }

    default:
      return {
        ok: false,
        error: `Unsupported tool: ${params.name}`,
      };
  }
}

export async function executeOpenAIStoreAgentRun(stallId: number, triggerSource: string): Promise<StoreAgentRunResult> {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const agent = await getManagerAgentByStore(stallId);
  if (!agent) {
    throw new Error("Store agent not configured");
  }
  if (agent.status !== "active") {
    throw new Error("Store agent is paused");
  }

  const analytics = await getStoreAnalytics(stallId);
  let latestItems = await getStoreItems(stallId);
  const lowStockItems = latestItems.filter(item => {
    const inventory = item.inventory;
    return inventory && inventory.current_stock <= inventory.reorder_threshold && item.status !== "archived";
  });

  const actions: AgentAction[] = [];
  const failures: AgentFailure[] = [];
  const toolNotes: ToolNote = {};
  const toolCalls: Record<string, any>[] = [
    { tool: "bootstrap", analyticsFetched: true, itemsFetched: true, lowStockItems: lowStockItems.length },
  ];

  const run = await createAgentRun({
    agentId: agent.id,
    runType: "autonomous_store_scan",
    triggerSource,
    state: "discovering",
    toolCalls,
    decisionSummary: `Discovered ${lowStockItems.length} low-stock items and ${analytics.failedOrders} failed orders.`,
    computeCostEstimate: Math.min(agent.budget_daily_tokens, 1800),
  });

  try {
    await updateAgentRun(run.id, {
      state: "planning",
    });

    const conversationInput: any[] = [
      {
        role: "developer",
        content: buildAgentInstructions(agent),
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            storeId: stallId,
            triggerSource,
            analytics,
            items: buildStoreStateSnapshot(latestItems),
            policy: {
              budgetDailyCalls: agent.budget_daily_calls,
              budgetDailyTokens: agent.budget_daily_tokens,
              maxRestockValue: agent.max_restock_value,
              maxPriceChangePct: agent.max_price_change_pct,
              minConfidence: agent.min_confidence,
              allowedSkus: agent.allowed_skus || [],
            },
          },
          null,
          2,
        ),
      },
    ];

    const tools = buildOpenAITools();
    let finalResponseText = "";

    for (let turn = 0; turn < MAX_AGENT_TURNS; turn += 1) {
      const response = await openai.responses.create({
        model: DEFAULT_OPENAI_STORE_AGENT_MODEL,
        input: conversationInput,
        tools,
        reasoning: { effort: "medium" },
        max_output_tokens: 1200,
      });

      const requestId = (response as any)?._request_id;
      if (requestId) {
        toolCalls.push({ tool: "openai_response", requestId, turn });
      }

      finalResponseText = response.output_text || finalResponseText;
      const functionCalls = (response.output || []).filter((item: any) => item.type === "function_call");

      if (!functionCalls.length) {
        break;
      }

      await updateAgentRun(run.id, {
        state: turn === 0 ? "executing" : "verifying",
        toolCalls,
      });

      for (const toolCall of functionCalls as any[]) {
        const result = await executeStoreTool({
          name: toolCall.name,
          argumentsJson: toolCall.arguments,
          stallId,
          agent,
          latestItems,
          analytics,
          actions,
          failures,
          toolNotes,
        });

        toolCalls.push({
          tool: toolCall.name,
          arguments: toolCall.arguments,
          result,
        });

        conversationInput.push({
          type: "function_call_output",
          call_id: toolCall.call_id,
          output: JSON.stringify(result),
        });

        if (toolCall.name === "restock_items") {
          latestItems = await getStoreItems(stallId);
        }
      }
    }

    const finalState: AgentRun["state"] = failures.length > 0 && actions.length === 0 ? "failed" : "submitted";
    const updatedRun = await updateAgentRun(run.id, {
      state: finalState,
      decisionSummary:
        toolNotes.summary ||
        finalResponseText ||
        (actions.length > 0
          ? `Executed ${actions.length} autonomous store actions through OpenAI tool calling.`
          : "No safe autonomous actions were available within current guardrails."),
      toolCalls,
      failures,
      output: {
        analytics,
        actions,
        model: DEFAULT_OPENAI_STORE_AGENT_MODEL,
        finalResponseText,
      },
      completedAt: new Date().toISOString(),
    });

    await createAgentValidation({
      agentRunId: updatedRun.id,
      status: "pending",
      evidenceUri: `/api/agents/${agent.id}/logs`,
    });

    return {
      agent,
      run: updatedRun,
      actions,
      analytics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI autonomous run failed";
    await updateAgentRun(run.id, {
      state: "failed",
      failures: [...failures, { type: "runtime_error", message }],
      output: {
        analytics,
        actions,
        model: DEFAULT_OPENAI_STORE_AGENT_MODEL,
      },
      completedAt: new Date().toISOString(),
    });
    throw new Error(`OpenAI store agent run failed: ${message}`);
  }
}

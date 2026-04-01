import { ensureUserExists } from "../userService";
import { normalizeAddress } from "./shared";
import { encodeFunctionData } from "viem";
import {
  ERC8004_IDENTITY_REGISTRY_ABI,
  ERC8004_OPERATING_CHAIN_ID,
  ERC8004_REPUTATION_REGISTRY_ABI,
  ERC8004_SPEC_URL,
  ERC8004_TRUST_CHAIN_ID,
  ERC8004_VALIDATION_REGISTRY_ABI,
  buildAbsoluteAppUrl,
  buildRegistryRef,
  buildTrustExplorerUrl,
  createErc8004PublicClient,
  createErc8004WalletClients,
  getAppBaseUrl,
  getErc8004TrustConfig,
  hashJsonPayload,
  parseRegisteredAgentId,
} from "~~/lib/erc8004";
import type { StoreTrustSnapshot } from "~~/lib/store.types";
import type {
  AgentRun,
  AgentValidation,
  Erc8004AgentRecord,
  Erc8004AgentRole,
  ManagerAgent,
  ReputationEventRecord,
} from "~~/lib/supabase";
import { supabase } from "~~/lib/supabase";

type TrustAgentMetadata = Record<string, unknown>;

type ValidationReview = {
  score: number;
  tag: string;
  summary: string;
  findings: string[];
};

type AgentRunWithAgent = AgentRun & {
  agent: ManagerAgent | null;
};

const PLATFORM_ROLE_DETAILS: Record<
  Extract<Erc8004AgentRole, "validator" | "reviewer">,
  { name: string; description: string }
> = {
  validator: {
    name: "SplitHub Trust Auditor",
    description: "Reviews autonomous store runs, checks guardrails, and publishes ERC-8004 validation results.",
  },
  reviewer: {
    name: "SplitHub Review Agent",
    description: "Writes ERC-8004 reputation only after a validated store-agent outcome.",
  },
};

function resolvePrivateKeyForRole(role: Erc8004AgentRole) {
  const value =
    role === "manager"
      ? process.env.ERC8004_MANAGER_PRIVATE_KEY || process.env.SPLITHUB_STORE_MANAGER_PRIVATE_KEY
      : role === "validator"
        ? process.env.ERC8004_VALIDATOR_PRIVATE_KEY
        : process.env.ERC8004_REVIEWER_PRIVATE_KEY;

  return value?.startsWith("0x") ? (value as `0x${string}`) : value ? (`0x${value}` as `0x${string}`) : null;
}

function resolvePlatformRoleWallet(role: "validator" | "reviewer") {
  const configuredWallet =
    role === "validator"
      ? process.env.ERC8004_VALIDATOR_OPERATOR_WALLET || process.env.NEXT_PUBLIC_ERC8004_VALIDATOR_OPERATOR_WALLET
      : process.env.ERC8004_REVIEWER_OPERATOR_WALLET || process.env.NEXT_PUBLIC_ERC8004_REVIEWER_OPERATOR_WALLET;

  if (configuredWallet) {
    return normalizeAddress(configuredWallet);
  }

  const privateKey = resolvePrivateKeyForRole(role);
  if (!privateKey) {
    return null;
  }

  return normalizeAddress(createErc8004WalletClients(privateKey).account.address);
}

type TrustAutomationContext = {
  privateKey: `0x${string}`;
  signerAddress: string;
  walletClient: ReturnType<typeof createErc8004WalletClients>["walletClient"];
};

function resolveTrustAutomationContext(
  agent: Pick<Erc8004AgentRecord, "role" | "operator_wallet" | "owner_wallet"> | null | undefined,
): TrustAutomationContext | null {
  if (!agent) {
    return null;
  }

  const privateKey = resolvePrivateKeyForRole(agent.role);
  if (!privateKey) {
    return null;
  }

  const { walletClient, account } = createErc8004WalletClients(privateKey);
  const signerAddress = normalizeAddress(account.address);

  if (
    signerAddress !== normalizeAddress(agent.operator_wallet) &&
    signerAddress !== normalizeAddress(agent.owner_wallet)
  ) {
    return null;
  }

  return {
    privateKey,
    signerAddress,
    walletClient,
  };
}

export function resolveManagerDemoOperatorWallet() {
  const privateKey = resolvePrivateKeyForRole("manager");
  if (!privateKey) {
    return null;
  }

  return normalizeAddress(createErc8004WalletClients(privateKey).account.address);
}

export function isManagerTrustAutomationEnabled(
  agent: Pick<Erc8004AgentRecord, "role" | "operator_wallet" | "owner_wallet"> | null | undefined,
) {
  return Boolean(resolveTrustAutomationContext(agent));
}

function formatOnchainSubmissionError(error: unknown) {
  if (error instanceof Error) {
    const candidate = error as Error & {
      shortMessage?: string;
      cause?: { shortMessage?: string; signature?: string; raw?: string };
    };
    const details = [
      candidate.shortMessage || candidate.message,
      candidate.cause?.signature ? `signature=${candidate.cause.signature}` : null,
      candidate.cause?.raw ? `raw=${candidate.cause.raw}` : null,
    ].filter(Boolean);

    return details.join(" | ");
  }

  return String(error);
}

function addGasBuffer(estimate: bigint, multiplier = 120n, divisor = 100n) {
  return (estimate * multiplier + (divisor - 1n)) / divisor;
}

function ensureAgentUsesCurrentIdentityRegistry(
  agent: Pick<Erc8004AgentRecord, "registry_agent_id" | "identity_registry_address">,
  label: string,
) {
  const config = getErc8004TrustConfig();
  const currentIdentityRegistry = config.identityRegistryAddress.toLowerCase();
  if (agent.registry_agent_id && agent.identity_registry_address?.toLowerCase() === currentIdentityRegistry) {
    return;
  }

  throw new Error(
    `${label} must be registered on the current ERC-8004 identity registry (${config.identityRegistryAddress}) before continuing. Current value: ${agent.identity_registry_address || "missing"}${agent.registry_agent_id ? ` (agentId ${agent.registry_agent_id})` : ""}.`,
  );
}

function getRoleCapabilities(role: Erc8004AgentRole) {
  if (role === "manager") {
    return ["store-planning", "inventory-restock", "validation-request"];
  }

  if (role === "validator") {
    return ["guardrail-review", "validation-response", "cross-chain-evidence-check"];
  }

  return ["reputation-feedback", "trust-tagging", "proof-of-payment-linking"];
}

function getRoleTrustModels(role: Erc8004AgentRole) {
  if (role === "manager") {
    return ["identity", "validation-request", "cross-chain-operations"];
  }

  if (role === "validator") {
    return ["validation", "guardrail-enforcement"];
  }

  return ["reputation", "validated-outcome-reviews"];
}

function isCurrentIdentityRegistration(
  agent: Pick<Erc8004AgentRecord, "registry_agent_id" | "identity_registry_address">,
) {
  return (
    Boolean(agent.registry_agent_id) &&
    Boolean(agent.identity_registry_address) &&
    agent.identity_registry_address?.toLowerCase() === getErc8004TrustConfig().identityRegistryAddress.toLowerCase()
  );
}

function buildBaseOperationalTxs(run: AgentRun) {
  const seen = new Set<string>();
  const candidates: string[] = [];
  const output = run.output_json || {};
  const actions = Array.isArray(output.actions) ? output.actions : [];

  for (const action of actions) {
    const txHash = action?.txHash || action?.paymentTxHash || action?.baseTxHash || action?.settlementTxHash;
    if (typeof txHash === "string" && txHash.startsWith("0x") && !seen.has(txHash)) {
      seen.add(txHash);
      candidates.push(txHash);
    }
  }

  return candidates.map(txHash => ({
    chainId: ERC8004_OPERATING_CHAIN_ID,
    txHash,
    explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
  }));
}

function buildGuardrailChecks(run: AgentRun, agent: ManagerAgent | null) {
  return [
    {
      name: "minimum-confidence",
      passed: !(run.failures_json || []).some(failure => failure?.type === "confidence_guardrail"),
      threshold: agent?.min_confidence ?? null,
    },
    {
      name: "max-restock-value",
      passed: !(run.failures_json || []).some(failure => failure?.type === "budget_guardrail"),
      threshold: agent?.max_restock_value ?? null,
    },
    {
      name: "allowed-skus",
      passed: !(run.failures_json || []).some(failure => failure?.type === "sku_guardrail"),
      threshold: agent?.allowed_skus || [],
    },
    {
      name: "supplier-acceptance",
      passed: !(run.failures_json || []).some(failure => failure?.type === "supplier_rejected"),
      threshold: "accepted",
    },
  ];
}

function buildTrustEvidence(run: AgentRunWithAgent, managerTrustAgentId?: string | null) {
  return {
    type: "splithub-store-evidence/v1",
    runId: run.id,
    managerAgentId: run.agent_id,
    managerTrustAgentId: managerTrustAgentId || null,
    operatingChainId: ERC8004_OPERATING_CHAIN_ID,
    trustChainId: ERC8004_TRUST_CHAIN_ID,
    triggerSource: run.trigger_source,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    decisionSummary: run.decision_summary,
    inputState: run.output_json?.inputState || null,
    toolCalls: run.tool_calls_json || [],
    outputs: run.output_json || {},
    failures: run.failures_json || [],
    guardrailChecks: buildGuardrailChecks(run, run.agent),
    relatedOperationalTransactions: buildBaseOperationalTxs(run),
  };
}

function evaluateValidation(run: AgentRunWithAgent): ValidationReview {
  const findings: string[] = [];
  const failures = Array.isArray(run.failures_json) ? run.failures_json : [];
  const actions = Array.isArray(run.output_json?.actions) ? run.output_json.actions : [];
  const toolCalls = Array.isArray(run.tool_calls_json) ? run.tool_calls_json : [];

  if (run.state !== "submitted") {
    findings.push(`Run ended in ${run.state} instead of submitted.`);
  }

  if (failures.some(failure => failure?.type === "runtime_error")) {
    findings.push("Runtime error present in failure log.");
  }

  if (actions.length > 0) {
    const hasExecutionToolCall = toolCalls.some(toolCall =>
      ["restock_items", "restockItems"].includes(String(toolCall?.tool || "")),
    );
    if (!hasExecutionToolCall) {
      findings.push("Actions were recorded without a matching execution tool call.");
    }
  }

  if (failures.some(failure => ["supplier_rejected", "missing_item", "archived_item"].includes(failure?.type))) {
    findings.push("Execution evidence contains failed or inconsistent store actions.");
  }

  const score = findings.length === 0 ? 100 : 0;
  const tag = score === 100 ? "validated" : "rejected";

  return {
    score,
    tag,
    summary:
      score === 100
        ? "Evidence, tool calls, and guardrail checks were consistent with a valid manager run."
        : `Validation failed with ${findings.length} reviewer finding${findings.length === 1 ? "" : "s"}.`,
    findings,
  };
}

async function getAgentRunWithManager(runId: string): Promise<AgentRunWithAgent> {
  const { data, error } = await supabase
    .from("agent_runs")
    .select(
      `
      *,
      agent:manager_agents(*)
    `,
    )
    .eq("id", runId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch agent run ${runId}: ${error?.message}`);
  }

  return {
    ...(data as any),
    agent: (data as any).agent || null,
  } as AgentRunWithAgent;
}

async function getTrustAgentById(agentId: string) {
  const { data, error } = await supabase.from("erc8004_agents").select("*").eq("id", agentId).single();

  if (error || !data) {
    return null;
  }

  return data as Erc8004AgentRecord;
}

async function getOrCreateValidation(runId: string) {
  const { data: existing } = await supabase
    .from("agent_validations")
    .select("*")
    .eq("agent_run_id", runId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing?.[0]) {
    return existing[0] as AgentValidation;
  }

  const { data, error } = await supabase
    .from("agent_validations")
    .insert({
      agent_run_id: runId,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create validation for run ${runId}: ${error?.message}`);
  }

  return data as AgentValidation;
}

async function upsertTrustAgentRecord(params: {
  role: Erc8004AgentRole;
  name: string;
  description: string;
  ownerWallet: string;
  operatorWallet: string;
  linkedManagerAgentId?: string | null;
  metadata?: TrustAgentMetadata;
}) {
  const ownerWallet = normalizeAddress(params.ownerWallet);
  const operatorWallet = normalizeAddress(params.operatorWallet);
  const linkedManagerAgentId = params.linkedManagerAgentId || null;
  const metadata = params.metadata || {};

  await Promise.all([ensureUserExists(ownerWallet), ensureUserExists(operatorWallet)]);

  const lookup = linkedManagerAgentId
    ? await supabase.from("erc8004_agents").select("*").eq("linked_manager_agent_id", linkedManagerAgentId).limit(1)
    : await supabase
        .from("erc8004_agents")
        .select("*")
        .eq("role", params.role)
        .eq("operator_wallet", operatorWallet)
        .limit(1);

  const existing = lookup.data?.[0] as Erc8004AgentRecord | undefined;

  if (existing) {
    const nextAgentUri =
      existing.agent_uri || buildAbsoluteAppUrl(`/api/erc8004/agents/${existing.id}/registration.json`);
    const { data, error } = await supabase
      .from("erc8004_agents")
      .update({
        linked_manager_agent_id: linkedManagerAgentId,
        name: params.name,
        description: params.description,
        owner_wallet: ownerWallet,
        operator_wallet: operatorWallet,
        operating_chain_id: ERC8004_OPERATING_CHAIN_ID,
        trust_chain_id: ERC8004_TRUST_CHAIN_ID,
        agent_wallet: existing.agent_wallet || operatorWallet,
        agent_uri: nextAgentUri,
        metadata_json: { ...(existing.metadata_json || {}), ...metadata },
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update ${params.role} trust agent: ${error?.message}`);
    }

    return data as Erc8004AgentRecord;
  }

  const { data, error } = await supabase
    .from("erc8004_agents")
    .insert({
      linked_manager_agent_id: linkedManagerAgentId,
      role: params.role,
      name: params.name,
      description: params.description,
      owner_wallet: ownerWallet,
      operator_wallet: operatorWallet,
      operating_chain_id: ERC8004_OPERATING_CHAIN_ID,
      trust_chain_id: ERC8004_TRUST_CHAIN_ID,
      agent_wallet: operatorWallet,
      status: "pending",
      metadata_json: metadata,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert ${params.role} trust agent: ${error?.message}`);
  }

  const agentUri = buildAbsoluteAppUrl(`/api/erc8004/agents/${data.id}/registration.json`);
  const { data: withUri, error: uriError } = await supabase
    .from("erc8004_agents")
    .update({ agent_uri: agentUri })
    .eq("id", data.id)
    .select("*")
    .single();

  if (uriError || !withUri) {
    throw new Error(`Failed to set trust agent URI: ${uriError?.message}`);
  }

  return withUri as Erc8004AgentRecord;
}

async function maybeRegisterTrustAgentIdentity(agent: Erc8004AgentRecord) {
  if (isCurrentIdentityRegistration(agent)) {
    return agent;
  }

  const automationContext = resolveTrustAutomationContext(agent);
  if (!automationContext) {
    return agent;
  }

  const { walletClient, signerAddress } = automationContext;

  try {
    const config = getErc8004TrustConfig();
    const txHash = await walletClient.writeContract({
      address: config.identityRegistryAddress,
      abi: ERC8004_IDENTITY_REGISTRY_ABI,
      functionName: "register",
      args: [agent.agent_uri || buildAbsoluteAppUrl(`/api/erc8004/agents/${agent.id}/registration.json`)],
    });

    const registryAgentId = await parseRegisteredAgentId(txHash);

    const { data, error } = await supabase
      .from("erc8004_agents")
      .update({
        registry_agent_id: registryAgentId,
        agent_wallet: signerAddress,
        identity_tx_hash: txHash,
        identity_registry_address: config.identityRegistryAddress,
        status: registryAgentId ? "registered" : "link_pending",
      })
      .eq("id", agent.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to update registered trust agent");
    }

    if (agent.linked_manager_agent_id) {
      await supabase
        .from("manager_agents")
        .update({
          erc8004_agent_id: registryAgentId,
          agent_address: signerAddress,
        })
        .eq("id", agent.linked_manager_agent_id);
    }

    return data as Erc8004AgentRecord;
  } catch (error) {
    await supabase.from("erc8004_agents").update({ status: "failed" }).eq("id", agent.id);
    throw error;
  }
}

async function ensurePlatformTrustAgent(role: "validator" | "reviewer") {
  const operatorWallet = resolvePlatformRoleWallet(role);
  if (!operatorWallet) {
    return null;
  }

  const details = PLATFORM_ROLE_DETAILS[role];
  const record = await upsertTrustAgentRecord({
    role,
    name: details.name,
    description: details.description,
    ownerWallet: operatorWallet,
    operatorWallet,
    metadata: {
      capabilities: getRoleCapabilities(role),
      trustModels: getRoleTrustModels(role),
      spec: ERC8004_SPEC_URL,
    },
  });

  try {
    return await maybeRegisterTrustAgentIdentity(record);
  } catch (error) {
    console.error(`Failed to auto-register ${role} trust agent:`, error);
    return record;
  }
}

export async function registerTrustAgentIdentity(
  role: Erc8004AgentRole,
  operatorWallet: string,
  metadata: {
    linkedManagerAgentId?: string | null;
    name: string;
    description: string;
    ownerWallet?: string;
    metadataJson?: TrustAgentMetadata;
  },
) {
  const record = await upsertTrustAgentRecord({
    role,
    name: metadata.name,
    description: metadata.description,
    ownerWallet: metadata.ownerWallet || operatorWallet,
    operatorWallet,
    linkedManagerAgentId: metadata.linkedManagerAgentId,
    metadata: metadata.metadataJson,
  });

  return maybeRegisterTrustAgentIdentity(record);
}

export async function ensureTrustAgentsForManager(managerAgent: ManagerAgent) {
  const managerTrustAgentRecord = await upsertTrustAgentRecord({
    role: "manager",
    name: managerAgent.agent_name,
    description: "Autonomous store manager for SplitHub store operations on Base Sepolia.",
    ownerWallet: managerAgent.operator_wallet,
    operatorWallet: managerAgent.operator_wallet,
    linkedManagerAgentId: managerAgent.id,
    metadata: {
      capabilities: getRoleCapabilities("manager"),
      trustModels: getRoleTrustModels("manager"),
      operatingChainId: ERC8004_OPERATING_CHAIN_ID,
      trustChainId: ERC8004_TRUST_CHAIN_ID,
      storeManagerAgentId: managerAgent.id,
      spec: ERC8004_SPEC_URL,
    },
  });
  let managerTrustAgent = managerTrustAgentRecord;
  try {
    managerTrustAgent = await maybeRegisterTrustAgentIdentity(managerTrustAgentRecord);
  } catch (error) {
    console.error("Failed to auto-register manager trust agent:", error);
  }
  const [validatorAgent, reviewerAgent] = await Promise.all([
    ensurePlatformTrustAgent("validator"),
    ensurePlatformTrustAgent("reviewer"),
  ]);

  return {
    managerTrustAgent,
    validatorAgent,
    reviewerAgent,
  };
}

export async function getStoreTrustSnapshot(managerAgentId: string): Promise<StoreTrustSnapshot> {
  const { data: managerAgentData } = await supabase.from("manager_agents").select("*").eq("id", managerAgentId).single();
  const managerAgent = (managerAgentData as ManagerAgent | null) || null;

  const { managerTrustAgent, validatorAgent, reviewerAgent } = managerAgent
    ? await ensureTrustAgentsForManager(managerAgent)
    : { managerTrustAgent: null, validatorAgent: null, reviewerAgent: null };

  const { data: agentRuns } = await supabase.from("agent_runs").select("id").eq("agent_id", managerAgentId).limit(100);
  const runIds = (agentRuns || []).map(run => run.id);
  const latestValidation = runIds.length
    ? ((
        await supabase
          .from("agent_validations")
          .select("*")
          .in("agent_run_id", runIds)
          .order("created_at", { ascending: false })
          .limit(1)
      ).data?.[0] as AgentValidation | undefined) || null
    : null;

  const reputationEvents = managerTrustAgent
    ? (((
        await supabase
          .from("agent_reputation_events")
          .select("*")
          .eq("subject_agent_id", managerTrustAgent.id)
          .order("created_at", { ascending: false })
      ).data || []) as ReputationEventRecord[])
    : [];

  return {
    managerTrustAgent,
    validatorAgent,
    reviewerAgent,
    managerAutomationEnabled: isManagerTrustAutomationEnabled(managerTrustAgent),
    latestValidation,
    latestReputation: reputationEvents[0] || null,
    reputationEvents,
  };
}

async function getManagerAgentOrThrow(stallId: number) {
  const { data, error } = await supabase.from("manager_agents").select("*").eq("stall_id", stallId).single();

  if (error || !data) {
    throw new Error(`Manager agent not found for store ${stallId}: ${error?.message}`);
  }

  return data as ManagerAgent;
}

async function getLatestValidationForManager(managerAgentId: string) {
  const { data: runs, error: runsError } = await supabase
    .from("agent_runs")
    .select("id")
    .eq("agent_id", managerAgentId)
    .order("started_at", { ascending: false })
    .limit(25);

  if (runsError) {
    throw new Error(`Failed to fetch agent runs: ${runsError.message}`);
  }

  const runIds = (runs || []).map(run => run.id);
  if (!runIds.length) {
    return null;
  }

  const { data: validations, error } = await supabase
    .from("agent_validations")
    .select("*")
    .in("agent_run_id", runIds)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(`Failed to fetch agent validations: ${error.message}`);
  }

  const prioritized =
    (validations || []).find(
      validation =>
        validation.status === "pending" ||
        (validation.status === "submitted" && !validation.request_tx_hash) ||
        (validation.status === "failed" && !validation.request_tx_hash),
    ) || validations?.[0];

  return (prioritized as AgentValidation | undefined) || null;
}

async function getSignerAddressForTx(txHash: `0x${string}`) {
  const publicClient = createErc8004PublicClient();
  const tx = await publicClient.getTransaction({ hash: txHash });
  return normalizeAddress(tx.from);
}

export async function linkAgentWallet(agentId: string, wallet: string, deadline: bigint, signature: `0x${string}`) {
  const agent = await getTrustAgentById(agentId);
  if (!agent) {
    throw new Error(`Trust agent ${agentId} not found`);
  }

  if (!agent.registry_agent_id) {
    throw new Error("Trust agent is not registered onchain yet");
  }

  const privateKey = resolvePrivateKeyForRole(agent.role);
  if (!privateKey) {
    throw new Error(`No signing key configured for ${agent.role} trust agent`);
  }

  const { walletClient } = createErc8004WalletClients(privateKey);
  const config = getErc8004TrustConfig();
  const txHash = await walletClient.writeContract({
    address: config.identityRegistryAddress,
    abi: ERC8004_IDENTITY_REGISTRY_ABI,
    functionName: "setAgentWallet",
    args: [BigInt(agent.registry_agent_id), wallet as `0x${string}`, deadline, signature],
  });

  const { data, error } = await supabase
    .from("erc8004_agents")
    .update({
      agent_wallet: normalizeAddress(wallet),
      identity_tx_hash: txHash,
      identity_registry_address: config.identityRegistryAddress,
      status: "registered",
    })
    .eq("id", agent.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist linked agent wallet: ${error?.message}`);
  }

  return data as Erc8004AgentRecord;
}

function buildValidationRequestDocument(params: {
  validation: AgentValidation;
  run: AgentRunWithAgent;
  managerTrustAgent: Erc8004AgentRecord;
  validatorAgent: Erc8004AgentRecord | null;
  reviewerAgent: Erc8004AgentRecord | null;
}) {
  const evidence = buildTrustEvidence(params.run, params.managerTrustAgent.id);

  return {
    type: "splithub-erc8004-validation-request/v1",
    requestId: params.validation.id,
    requestHash: params.validation.request_hash,
    requestStatus: params.validation.status,
    requestURI: params.validation.request_uri,
    validator: params.validatorAgent
      ? {
          id: params.validatorAgent.id,
          registryAgentId: params.validatorAgent.registry_agent_id,
          operatorWallet: params.validatorAgent.operator_wallet,
        }
      : null,
    reviewer: params.reviewerAgent
      ? {
          id: params.reviewerAgent.id,
          registryAgentId: params.reviewerAgent.registry_agent_id,
          operatorWallet: params.reviewerAgent.operator_wallet,
        }
      : null,
    subject: {
      id: params.managerTrustAgent.id,
      registryAgentId: params.managerTrustAgent.registry_agent_id,
      operatorWallet: params.managerTrustAgent.operator_wallet,
      agentWallet: params.managerTrustAgent.agent_wallet,
    },
    evidence,
    response:
      params.validation.response_score === null
        ? null
        : {
            score: params.validation.response_score,
            responseHash: params.validation.response_hash,
            responseURI: params.validation.response_uri,
            reviewedAt: params.validation.reviewed_at,
          },
  };
}

function buildFeedbackDocument(params: {
  reputation: ReputationEventRecord;
  managerTrustAgent: Erc8004AgentRecord;
  reviewerAgent: Erc8004AgentRecord | null;
}) {
  return {
    type: "splithub-erc8004-feedback/v1",
    feedbackId: params.reputation.id,
    sourceRunId: params.reputation.source_run_id,
    sourceValidationId: params.reputation.source_validation_id,
    status: params.reputation.status,
    subject: {
      id: params.managerTrustAgent.id,
      registryAgentId: params.managerTrustAgent.registry_agent_id,
      operatorWallet: params.managerTrustAgent.operator_wallet,
      agentWallet: params.managerTrustAgent.agent_wallet,
    },
    reviewer: params.reviewerAgent
      ? {
          id: params.reviewerAgent.id,
          registryAgentId: params.reviewerAgent.registry_agent_id,
          operatorWallet: params.reviewerAgent.operator_wallet,
        }
      : null,
    score: params.reputation.score,
    valueDecimals: params.reputation.value_decimals,
    tags: [params.reputation.tag1, params.reputation.tag2].filter(Boolean),
    endpoint: params.reputation.endpoint,
    feedbackURI: params.reputation.feedback_uri,
    feedbackHash: params.reputation.feedback_hash,
    proofOfPayment: params.reputation.proof_of_payment_json || {},
    explorerUrl: params.reputation.explorer_url,
    createdAt: params.reputation.created_at,
  };
}

export async function submitValidationRequest(runId: string) {
  const run = await getAgentRunWithManager(runId);
  if (!run.agent) {
    throw new Error(`Manager agent missing for run ${runId}`);
  }

  const { managerTrustAgent, validatorAgent, reviewerAgent } = await ensureTrustAgentsForManager(run.agent);
  const validation = await getOrCreateValidation(run.id);
  const requestUri = buildAbsoluteAppUrl(
    `/api/erc8004/agents/${managerTrustAgent.id}/validation-request.json?validationId=${validation.id}`,
  );
  const requestDocument = buildValidationRequestDocument({
    validation,
    run,
    managerTrustAgent,
    validatorAgent,
    reviewerAgent,
  });
  const requestHash = hashJsonPayload(requestDocument);

  const { data, error } = await supabase
    .from("agent_validations")
    .update({
      validator_agent_id: validatorAgent?.id || null,
      request_id: validation.id,
      request_uri: requestUri,
      request_hash: requestHash,
      evidence_uri: requestUri,
      status: "pending",
    })
    .eq("id", validation.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist validation request: ${error?.message}`);
  }

  return data as AgentValidation;
}

async function maybeSubmitManagerValidationRequestOnchain(params: {
  validation: AgentValidation;
  managerTrustAgent: Erc8004AgentRecord;
  validatorAgent: Erc8004AgentRecord | null;
}) {
  if (params.validation.request_tx_hash) {
    return params.validation;
  }

  if (!params.managerTrustAgent.registry_agent_id || !isCurrentIdentityRegistration(params.managerTrustAgent)) {
    return params.validation;
  }

  const automationContext = resolveTrustAutomationContext(params.managerTrustAgent);
  if (!automationContext || !params.validatorAgent) {
    return params.validation;
  }

  if (!params.validation.request_hash || !params.validation.request_uri) {
    throw new Error("Validation request is missing request hash or URI");
  }

  const config = getErc8004TrustConfig();
  const txHash = await automationContext.walletClient.writeContract({
    address: config.validationRegistryAddress,
    abi: ERC8004_VALIDATION_REGISTRY_ABI,
    functionName: "validationRequest",
    args: [
      (params.validatorAgent.agent_wallet || params.validatorAgent.operator_wallet) as `0x${string}`,
      BigInt(params.managerTrustAgent.registry_agent_id),
      params.validation.request_uri,
      params.validation.request_hash as `0x${string}`,
    ],
  });

  await createErc8004PublicClient().waitForTransactionReceipt({ hash: txHash });

  const { data, error } = await supabase
    .from("agent_validations")
    .update({
      request_tx_hash: txHash,
      request_explorer_url: buildTrustExplorerUrl(txHash),
      status: "submitted",
    })
    .eq("id", params.validation.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist manager validation request tx: ${error?.message}`);
  }

  return data as AgentValidation;
}

export async function prepareManagerIdentityRegistration(stallId: number) {
  const managerAgent = await getManagerAgentOrThrow(stallId);
  const { managerTrustAgent } = await ensureTrustAgentsForManager(managerAgent);
  const config = getErc8004TrustConfig();

  if (isCurrentIdentityRegistration(managerTrustAgent)) {
    return {
      managerAgent,
      trustAgent: managerTrustAgent,
      txRequest: null,
    };
  }

  const data = encodeFunctionData({
    abi: ERC8004_IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [
      managerTrustAgent.agent_uri ||
        buildAbsoluteAppUrl(`/api/erc8004/agents/${managerTrustAgent.id}/registration.json`),
    ],
  });

  return {
    managerAgent,
    trustAgent: managerTrustAgent,
    txRequest: {
      chainId: ERC8004_TRUST_CHAIN_ID,
      to: config.identityRegistryAddress,
      data,
      value: "0",
    },
  };
}

export async function confirmManagerIdentityRegistration(stallId: number, txHash: `0x${string}`) {
  const managerAgent = await getManagerAgentOrThrow(stallId);
  const { managerTrustAgent } = await ensureTrustAgentsForManager(managerAgent);
  const signerAddress = await getSignerAddressForTx(txHash);

  if (signerAddress !== normalizeAddress(managerTrustAgent.operator_wallet)) {
    throw new Error("Submitted identity registration tx was not signed by the manager operator wallet");
  }

  const registryAgentId = await parseRegisteredAgentId(txHash);
  if (!registryAgentId) {
    throw new Error("Could not resolve ERC-8004 agent ID from the registration transaction");
  }

  const config = getErc8004TrustConfig();
  const { data, error } = await supabase
    .from("erc8004_agents")
    .update({
      registry_agent_id: registryAgentId,
      agent_wallet: signerAddress,
      identity_tx_hash: txHash,
      identity_registry_address: config.identityRegistryAddress,
      status: "registered",
    })
    .eq("id", managerTrustAgent.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist manager identity registration: ${error?.message}`);
  }

  await supabase
    .from("manager_agents")
    .update({
      erc8004_agent_id: registryAgentId,
      agent_address: signerAddress,
    })
    .eq("id", managerAgent.id);

  return data as Erc8004AgentRecord;
}

export async function prepareManagerValidationRequest(stallId: number) {
  const managerAgent = await getManagerAgentOrThrow(stallId);
  const { managerTrustAgent, validatorAgent } = await ensureTrustAgentsForManager(managerAgent);
  const config = getErc8004TrustConfig();

  if (!isCurrentIdentityRegistration(managerTrustAgent)) {
    throw new Error("Register the manager trust identity before submitting a validation request");
  }
  if (!validatorAgent) {
    throw new Error("Validator trust agent is not configured");
  }

  const latestValidation = await getLatestValidationForManager(managerAgent.id);
  if (!latestValidation) {
    throw new Error("No completed manager run is waiting for validation");
  }

  const validation =
    latestValidation.request_hash && latestValidation.request_uri
      ? latestValidation
      : await submitValidationRequest(latestValidation.agent_run_id);

  if (!validation.request_hash || !validation.request_uri) {
    throw new Error("Validation request is missing request hash or URI");
  }
  if (validation.request_tx_hash) {
    return {
      validation,
      txRequest: null,
    };
  }

  const data = encodeFunctionData({
    abi: ERC8004_VALIDATION_REGISTRY_ABI,
    functionName: "validationRequest",
    args: [
      (validatorAgent.agent_wallet || validatorAgent.operator_wallet) as `0x${string}`,
      BigInt(managerTrustAgent.registry_agent_id!),
      validation.request_uri,
      validation.request_hash as `0x${string}`,
    ],
  });

  return {
    validation,
    txRequest: {
      chainId: ERC8004_TRUST_CHAIN_ID,
      to: config.validationRegistryAddress,
      data,
      value: "0",
    },
  };
}

export async function confirmManagerValidationRequest(stallId: number, validationId: string, txHash: `0x${string}`) {
  const managerAgent = await getManagerAgentOrThrow(stallId);
  const { managerTrustAgent } = await ensureTrustAgentsForManager(managerAgent);
  const signerAddress = await getSignerAddressForTx(txHash);
  await createErc8004PublicClient().waitForTransactionReceipt({ hash: txHash });

  if (signerAddress !== normalizeAddress(managerTrustAgent.operator_wallet)) {
    throw new Error("Submitted validation request tx was not signed by the manager operator wallet");
  }

  const { data, error } = await supabase
    .from("agent_validations")
    .update({
      request_tx_hash: txHash,
      request_explorer_url: buildTrustExplorerUrl(txHash),
      status: "submitted",
    })
    .eq("id", validationId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist manager validation request tx: ${error?.message}`);
  }

  const respondedValidation = await submitValidationResponse(validationId);
  let reputation: ReputationEventRecord | null = null;

  if (respondedValidation.status === "verified") {
    reputation = await submitReputationFeedback(
      respondedValidation.agent_run_id,
      respondedValidation.response_score || 100,
      ["inventory", "ops"],
    );
  } else {
    await pauseManagerAfterRepeatedTrustFailures(managerAgent.id);
  }

  return {
    validation: respondedValidation,
    reputation,
  };
}

export async function submitValidationResponse(validationId: string, score?: number) {
  const { data, error } = await supabase.from("agent_validations").select("*").eq("id", validationId).single();
  if (error || !data) {
    throw new Error(`Failed to fetch validation ${validationId}: ${error?.message}`);
  }

  const validation = data as AgentValidation;
  const run = await getAgentRunWithManager(validation.agent_run_id);
  if (!run.agent) {
    throw new Error(`Manager agent missing for validation ${validationId}`);
  }

  const { managerTrustAgent, validatorAgent } = await ensureTrustAgentsForManager(run.agent);
  const review = evaluateValidation(run);
  const responseScore = typeof score === "number" ? Math.max(0, Math.min(100, score)) : review.score;
  const reviewedAt = new Date().toISOString();
  const responseUri =
    validation.request_uri ||
    buildAbsoluteAppUrl(
      `/api/erc8004/agents/${managerTrustAgent.id}/validation-request.json?validationId=${validation.id}`,
    );
  const responseDocument = {
    type: "splithub-erc8004-validation-response/v1",
    validationId: validation.id,
    requestHash: validation.request_hash,
    score: responseScore,
    summary: review.summary,
    findings: review.findings,
    reviewedAt,
    validator: validatorAgent
      ? {
          id: validatorAgent.id,
          registryAgentId: validatorAgent.registry_agent_id,
          operatorWallet: validatorAgent.operator_wallet,
        }
      : null,
  };
  const responseHash = hashJsonPayload(responseDocument);

  let txHash: `0x${string}` | null = null;
  let submissionError: string | null = null;
  if (validation.request_hash && validatorAgent) {
    const privateKey = resolvePrivateKeyForRole("validator");
    if (privateKey) {
      const { publicClient, walletClient } = createErc8004WalletClients(privateKey);
      try {
        const gasEstimate = await publicClient.estimateContractGas({
          address: getErc8004TrustConfig().validationRegistryAddress,
          abi: ERC8004_VALIDATION_REGISTRY_ABI,
          functionName: "validationResponse",
          args: [validation.request_hash as `0x${string}`, responseScore, responseUri, responseHash, review.tag],
          account: walletClient.account,
        });
        const gas = addGasBuffer(gasEstimate);

        txHash = await walletClient.writeContract({
          address: getErc8004TrustConfig().validationRegistryAddress,
          abi: ERC8004_VALIDATION_REGISTRY_ABI,
          functionName: "validationResponse",
          args: [validation.request_hash as `0x${string}`, responseScore, responseUri, responseHash, review.tag],
          gas,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") {
          submissionError = "Validation response transaction reverted onchain";
        }
      } catch (error) {
        submissionError = formatOnchainSubmissionError(error);
        console.error("Failed to submit ERC-8004 validation response onchain:", submissionError);
      }
    }
  }

  const { data: persisted, error: persistError } = await supabase
    .from("agent_validations")
    .update({
      validator_agent_id: validatorAgent?.id || validation.validator_agent_id,
      response_uri: responseUri,
      response_hash: responseHash,
      response_score: responseScore,
      erc8004_validation_tx: txHash,
      explorer_url: buildTrustExplorerUrl(txHash),
      reviewed_at: reviewedAt,
      status: submissionError ? "failed" : responseScore === 100 ? "verified" : "failed",
    })
    .eq("id", validation.id)
    .select("*")
    .single();

  if (persistError || !persisted) {
    throw new Error(`Failed to persist validation response: ${persistError?.message}`);
  }

  if (submissionError) {
    throw new Error(`Failed to submit ERC-8004 validation response onchain: ${submissionError}`);
  }

  return persisted as AgentValidation;
}

export async function submitReputationFeedback(
  runId: string,
  score: number,
  tags: [string, string] = ["inventory", "ops"],
) {
  const run = await getAgentRunWithManager(runId);
  if (!run.agent) {
    throw new Error(`Manager agent missing for run ${runId}`);
  }

  const validationResult = await supabase
    .from("agent_validations")
    .select("*")
    .eq("agent_run_id", runId)
    .order("created_at", { ascending: false })
    .limit(1);
  const validation = (validationResult.data?.[0] as AgentValidation | undefined) || null;

  if (!validation || validation.status !== "verified") {
    throw new Error("Reputation can only be submitted after a passing validation");
  }

  const { managerTrustAgent, reviewerAgent } = await ensureTrustAgentsForManager(run.agent);
  if (!reviewerAgent) {
    throw new Error("Reviewer trust agent is not configured");
  }
  ensureAgentUsesCurrentIdentityRegistry(managerTrustAgent, "Manager trust agent");
  ensureAgentUsesCurrentIdentityRegistry(reviewerAgent, "Reviewer trust agent");

  if (normalizeAddress(reviewerAgent.operator_wallet) === normalizeAddress(managerTrustAgent.operator_wallet)) {
    throw new Error("Reviewer wallet must be separate from the manager operator wallet");
  }

  const existingResult = await supabase.from("agent_reputation_events").select("*").eq("source_run_id", runId).limit(1);
  const existing = (existingResult.data?.[0] as ReputationEventRecord | undefined) || null;
  const feedbackUri = buildAbsoluteAppUrl(`/api/erc8004/agents/${managerTrustAgent.id}/feedback.json?runId=${runId}`);
  const proofOfPayment = {
    chainId: ERC8004_OPERATING_CHAIN_ID,
    transactions: buildBaseOperationalTxs(run),
  };
  const feedbackDocument = {
    type: "splithub-erc8004-feedback/v1",
    sourceRunId: runId,
    sourceValidationId: validation.id,
    subjectAgentId: managerTrustAgent.id,
    reviewerAgentId: reviewerAgent.id,
    score,
    valueDecimals: 0,
    tags,
    endpoint: run.trigger_source,
    proofOfPayment,
  };
  const feedbackHash = hashJsonPayload(feedbackDocument);

  let reputationTxHash: string | null = null;
  let submissionError: string | null = null;
  if (managerTrustAgent.registry_agent_id && reviewerAgent.registry_agent_id) {
    const privateKey = resolvePrivateKeyForRole("reviewer");
    if (privateKey) {
      try {
        reputationTxHash = await createErc8004WalletClients(privateKey).walletClient.writeContract({
          address: getErc8004TrustConfig().reputationRegistryAddress,
          abi: ERC8004_REPUTATION_REGISTRY_ABI,
          functionName: "giveFeedback",
          args: [
            BigInt(managerTrustAgent.registry_agent_id),
            BigInt(score),
            0,
            tags[0],
            tags[1],
            run.trigger_source,
            feedbackUri,
            feedbackHash,
          ],
        });
      } catch (error) {
        submissionError = formatOnchainSubmissionError(error);
        console.error("Failed to submit ERC-8004 reputation feedback onchain:", submissionError);
      }
    }
  }

  const payload = {
    subject_agent_id: managerTrustAgent.id,
    reviewer_agent_id: reviewerAgent.id,
    source_run_id: runId,
    source_validation_id: validation.id,
    score,
    value_decimals: 0,
    tag1: tags[0],
    tag2: tags[1],
    endpoint: run.trigger_source,
    feedback_uri: feedbackUri,
    feedback_hash: feedbackHash,
    reputation_tx_hash: reputationTxHash,
    explorer_url: buildTrustExplorerUrl(reputationTxHash),
    proof_of_payment_json: proofOfPayment,
    status: submissionError ? "failed" : reputationTxHash ? "verified" : "submitted",
  };

  const mutation = existing
    ? supabase.from("agent_reputation_events").update(payload).eq("id", existing.id).select("*").single()
    : supabase.from("agent_reputation_events").insert(payload).select("*").single();

  const { data, error } = await mutation;
  if (error || !data) {
    throw new Error(`Failed to persist reputation feedback: ${error?.message}`);
  }

  if (submissionError) {
    throw new Error(`Failed to submit ERC-8004 reputation feedback onchain: ${submissionError}`);
  }

  return data as ReputationEventRecord;
}

async function pauseManagerAfterRepeatedTrustFailures(managerAgentId: string) {
  const { data: runs } = await supabase
    .from("agent_runs")
    .select("id")
    .eq("agent_id", managerAgentId)
    .order("started_at", { ascending: false })
    .limit(3);

  const runIds = (runs || []).map(run => run.id);
  if (runIds.length < 3) {
    return;
  }

  const { data: validations } = await supabase
    .from("agent_validations")
    .select("agent_run_id, status")
    .in("agent_run_id", runIds);

  const statusByRunId = new Map((validations || []).map(validation => [validation.agent_run_id, validation.status]));
  const latestThreeFailed = runIds.every(runId => statusByRunId.get(runId) === "failed");

  if (latestThreeFailed) {
    await supabase.from("manager_agents").update({ status: "paused" }).eq("id", managerAgentId);
  }
}

export async function processCompletedManagerRun(runId: string) {
  const run = await getAgentRunWithManager(runId);
  if (!run.agent) {
    throw new Error(`Manager agent missing for run ${runId}`);
  }

  const { managerTrustAgent, validatorAgent } = await ensureTrustAgentsForManager(run.agent);
  let validation = await submitValidationRequest(runId);
  let reputation: ReputationEventRecord | null = null;

  validation = await maybeSubmitManagerValidationRequestOnchain({
    validation,
    managerTrustAgent,
    validatorAgent,
  });

  if (validation.request_tx_hash) {
    validation = await submitValidationResponse(validation.id);

    if (validation.status === "verified") {
      reputation = await submitReputationFeedback(validation.agent_run_id, validation.response_score || 100, [
        "inventory",
        "ops",
      ]);
    } else {
      await pauseManagerAfterRepeatedTrustFailures(run.agent.id);
    }
  }

  return {
    validation,
    reputation,
  };
}

export async function buildRegistrationPayload(agentId: string) {
  const agent = await getTrustAgentById(agentId);
  if (!agent) {
    throw new Error(`Trust agent ${agentId} not found`);
  }

  const config = getErc8004TrustConfig();

  return {
    type: ERC8004_SPEC_URL,
    name: agent.name,
    description: agent.description,
    image: `${getAppBaseUrl()}/icon.png`,
    services: [
      {
        kind: "registration",
        url: buildAbsoluteAppUrl(`/api/erc8004/agents/${agent.id}/registration.json`),
      },
      {
        kind: "validation-request",
        url: buildAbsoluteAppUrl(`/api/erc8004/agents/${agent.id}/validation-request.json`),
      },
      {
        kind: "feedback",
        url: buildAbsoluteAppUrl(`/api/erc8004/agents/${agent.id}/feedback.json`),
      },
      {
        kind: "devspot-manifest",
        url: buildAbsoluteAppUrl("/agent.json"),
      },
    ],
    endpoints: [
      buildAbsoluteAppUrl(`/api/erc8004/agents/${agent.id}/registration.json`),
      buildAbsoluteAppUrl(`/api/erc8004/agents/${agent.id}/validation-request.json`),
      buildAbsoluteAppUrl(`/api/erc8004/agents/${agent.id}/feedback.json`),
    ],
    agentWallet: agent.agent_wallet || agent.operator_wallet,
    operatorWallet: agent.operator_wallet,
    ownerWallet: agent.owner_wallet,
    role: agent.role,
    status: agent.status,
    capabilities: getRoleCapabilities(agent.role),
    supportedTrustModels: getRoleTrustModels(agent.role),
    trustRegistries: {
      chainId: ERC8004_TRUST_CHAIN_ID,
      identity: {
        address: config.identityRegistryAddress,
        ref: buildRegistryRef(config.identityRegistryAddress),
      },
      validation: {
        address: config.validationRegistryAddress,
        ref: buildRegistryRef(config.validationRegistryAddress),
      },
      reputation: {
        address: config.reputationRegistryAddress,
        ref: buildRegistryRef(config.reputationRegistryAddress),
      },
    },
    registryAgentId: agent.registry_agent_id,
    agentUri: agent.agent_uri,
    metadata: agent.metadata_json || {},
  };
}

export async function buildLatestValidationRequestPayload(agentId: string, validationId?: string | null) {
  const agent = await getTrustAgentById(agentId);
  if (!agent) {
    throw new Error(`Trust agent ${agentId} not found`);
  }

  let validation: AgentValidation | null = null;
  if (validationId) {
    const validationResult = await supabase.from("agent_validations").select("*").eq("id", validationId).single();
    validation = (validationResult.data as AgentValidation | null) || null;
  } else if (agent.linked_manager_agent_id) {
    const { data: runs } = await supabase
      .from("agent_runs")
      .select("id")
      .eq("agent_id", agent.linked_manager_agent_id)
      .order("started_at", { ascending: false })
      .limit(20);
    const runIds = (runs || []).map(run => run.id);

    if (runIds.length) {
      const validationResult = await supabase
        .from("agent_validations")
        .select("*")
        .in("agent_run_id", runIds)
        .order("created_at", { ascending: false })
        .limit(1);
      validation = (validationResult.data?.[0] as AgentValidation | undefined) || null;
    }
  }

  if (!validation) {
    return {
      type: "splithub-erc8004-validation-request/v1",
      subjectAgentId: agent.id,
      status: "not_found",
    };
  }

  const run = await getAgentRunWithManager(validation.agent_run_id);
  const snapshot = run.agent
    ? await ensureTrustAgentsForManager(run.agent)
    : { managerTrustAgent: agent, validatorAgent: null, reviewerAgent: null };
  return buildValidationRequestDocument({
    validation,
    run,
    managerTrustAgent: snapshot.managerTrustAgent,
    validatorAgent: snapshot.validatorAgent,
    reviewerAgent: snapshot.reviewerAgent,
  });
}

export async function buildLatestFeedbackPayload(agentId: string, runId?: string | null) {
  const agent = await getTrustAgentById(agentId);
  if (!agent) {
    throw new Error(`Trust agent ${agentId} not found`);
  }

  const reputationResult = runId
    ? await supabase.from("agent_reputation_events").select("*").eq("source_run_id", runId).limit(1)
    : await supabase
        .from("agent_reputation_events")
        .select("*")
        .eq("subject_agent_id", agent.id)
        .order("created_at", { ascending: false })
        .limit(1);
  const reputation = (reputationResult.data?.[0] as ReputationEventRecord | undefined) || null;

  if (!reputation) {
    return {
      type: "splithub-erc8004-feedback/v1",
      subjectAgentId: agent.id,
      status: "not_found",
    };
  }

  const reviewerAgent = await getTrustAgentById(reputation.reviewer_agent_id);
  return buildFeedbackDocument({
    reputation,
    managerTrustAgent: agent,
    reviewerAgent,
  });
}

import { NextResponse } from "next/server";
import { getErc8004TrustConfig } from "~~/lib/erc8004";
import { supabase } from "~~/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const trustConfig = getErc8004TrustConfig();
  const [{ data: agents }, { data: trustAgents }] = await Promise.all([
    supabase.from("manager_agents").select("*").order("created_at", { ascending: false }),
    supabase.from("erc8004_agents").select("*").order("created_at", { ascending: false }),
  ]);

  const managerTrustByManagerId = new Map(
    (trustAgents || [])
      .filter(agent => agent.role === "manager" && agent.linked_manager_agent_id)
      .map(agent => [agent.linked_manager_agent_id, agent]),
  );

  return NextResponse.json({
    name: "SplitHub Autonomous Store Orchestrator",
    operator_wallet: process.env.NEXT_PUBLIC_PLATFORM_OPERATOR_WALLET || null,
    trust_chain: {
      name: "Ethereum Sepolia",
      chain_id: trustConfig.chainId,
      identity_registry: trustConfig.identityRegistryAddress,
      validation_registry: trustConfig.validationRegistryAddress,
      reputation_registry: trustConfig.reputationRegistryAddress,
    },
    supported_trust_registries: ["identity", "validation", "reputation"],
    supported_trust_models: ["cross-chain-validation", "validated-reputation", "proof-of-payment-linking"],
    supported_tools: [
      "supabase-db",
      "supabase-realtime",
      "batch-payment-relay",
      "store-checkout",
      "inventory-restock",
      "agent-run-logging",
      "erc8004-validation",
      "erc8004-reputation",
    ],
    supported_tech_stacks: ["nextjs", "react", "typescript", "supabase", "viem", "wagmi", "foundry"],
    compute_constraints: {
      default_daily_calls: 24,
      default_daily_tokens: 15000,
      default_timeout_ms: 30000,
      max_tool_calls_per_run: 8,
    },
    supported_task_categories: [
      "store-creation",
      "catalog-management",
      "inventory-maintenance",
      "split-checkout",
      "analytics",
      "autonomous-restock",
    ],
    safety_policies: [
      "server-side cart requote",
      "recipient split validation",
      "stock verification before checkout",
      "restock budget caps",
      "soft status changes instead of deletes",
      "pause agent after repeated failures",
      "validator wallet separate from store operators",
      "reviewer writes reputation only after passing validation",
    ],
    trust_roles: (trustAgents || []).map(agent => ({
      id: agent.id,
      role: agent.role,
      name: agent.name,
      operator_wallet: agent.operator_wallet,
      agent_wallet: agent.agent_wallet,
      registry_agent_id: agent.registry_agent_id,
      trust_chain_id: agent.trust_chain_id,
      operating_chain_id: agent.operating_chain_id,
      status: agent.status,
    })),
    deployed_store_agents: (agents || []).map(agent => ({
      id: agent.id,
      stall_id: agent.stall_id,
      agent_name: agent.agent_name,
      operator_wallet: agent.operator_wallet,
      erc8004_agent_id: agent.erc8004_agent_id,
      trust_role: managerTrustByManagerId.get(agent.id)?.role || null,
      trust_status: managerTrustByManagerId.get(agent.id)?.status || "pending",
      trust_registration_uri: managerTrustByManagerId.get(agent.id)?.agent_uri || null,
      status: agent.status,
    })),
  });
}

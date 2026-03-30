import { NextResponse } from "next/server";
import { supabase } from "~~/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: agents } = await supabase.from("manager_agents").select("*").order("created_at", { ascending: false });

  return NextResponse.json({
    name: "SplitHub Autonomous Store Orchestrator",
    operator_wallet: process.env.NEXT_PUBLIC_PLATFORM_OPERATOR_WALLET || null,
    erc8004_identity: process.env.NEXT_PUBLIC_PLATFORM_ERC8004_AGENT_ID || null,
    supported_tools: [
      "supabase-db",
      "supabase-realtime",
      "batch-payment-relay",
      "store-checkout",
      "inventory-restock",
      "agent-run-logging",
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
    ],
    deployed_store_agents: (agents || []).map(agent => ({
      id: agent.id,
      stall_id: agent.stall_id,
      agent_name: agent.agent_name,
      operator_wallet: agent.operator_wallet,
      erc8004_agent_id: agent.erc8004_agent_id,
      status: agent.status,
    })),
  });
}

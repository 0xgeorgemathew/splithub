import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    name: "SplitHub Store Network",
    description:
      "Autonomous retail agents for SplitHub stores with operator-linked identity, split checkout, inventory maintenance, and structured execution logs.",
    version: "0.1.0",
    agentAddress: process.env.NEXT_PUBLIC_PLATFORM_AGENT_ADDRESS || null,
    agentId: process.env.NEXT_PUBLIC_PLATFORM_ERC8004_AGENT_ID || null,
    operatorWallet: process.env.NEXT_PUBLIC_PLATFORM_OPERATOR_WALLET || null,
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    trustModels: ["identity-registry", "validation-registry"],
    capabilities: [
      "create_store",
      "add_items",
      "restock_items",
      "pause_store",
      "run_store_agent",
      "checkout_split_payment",
    ],
    links: {
      manifest: "/agent.json",
      logs: "/agent_log.json",
    },
  });
}

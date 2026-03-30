import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { TOKENS } from "~~/config/tokens";
import { createStore } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      adminWallet,
      networkName,
      networkSlug,
      storeName,
      storeSlug,
      storeDescription,
      managerWallet,
      managerTwitterHandle,
      splitPercentage,
      tokenAddress,
      agentName,
    } = body;

    if (!adminWallet || !isAddress(adminWallet)) {
      return NextResponse.json({ error: "Valid adminWallet is required" }, { status: 400 });
    }

    if (!storeName || !networkName) {
      return NextResponse.json({ error: "networkName and storeName are required" }, { status: 400 });
    }

    if (managerWallet && !isAddress(managerWallet)) {
      return NextResponse.json({ error: "managerWallet must be a valid address" }, { status: 400 });
    }

    if (splitPercentage !== undefined && (splitPercentage < 0 || splitPercentage > 100)) {
      return NextResponse.json({ error: "splitPercentage must be between 0 and 100" }, { status: 400 });
    }

    const result = await createStore({
      adminWallet,
      networkName,
      networkSlug: networkSlug || networkName,
      storeName,
      storeSlug: storeSlug || storeName,
      storeDescription,
      managerWallet,
      managerTwitterHandle,
      splitPercentage,
      tokenAddress: tokenAddress || TOKENS.USDC,
      agentName,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create store error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create store" },
      { status: 500 },
    );
  }
}

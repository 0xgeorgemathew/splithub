import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";

const CHAIN_ID = 84532; // Base Sepolia

export async function POST(request: NextRequest) {
  try {
    const { signer, owner, signature } = await request.json();

    // Validate inputs
    if (!signer || !owner || !signature) {
      return NextResponse.json({ error: "Missing required fields: signer, owner, signature" }, { status: 400 });
    }

    if (!isAddress(signer) || !isAddress(owner)) {
      return NextResponse.json({ error: "Invalid address format" }, { status: 400 });
    }

    // Get relayer private key
    const relayerKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerKey) {
      return NextResponse.json({ error: "Relayer not configured" }, { status: 500 });
    }

    // Get contract info
    const registryContract = deployedContracts[CHAIN_ID]?.SplitHubRegistry;
    if (!registryContract) {
      return NextResponse.json({ error: "SplitHubRegistry not deployed on this chain" }, { status: 500 });
    }

    // Create wallet client
    const account = privateKeyToAccount(relayerKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    // Submit transaction
    const hash = await walletClient.writeContract({
      address: registryContract.address,
      abi: registryContract.abi,
      functionName: "register",
      args: [signer, owner, signature],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch (error) {
    console.error("Relay register error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

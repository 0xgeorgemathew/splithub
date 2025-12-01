import { NextRequest, NextResponse } from "next/server";
import { Abi } from "viem";
import { createPublicClient, createWalletClient, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";

const CHAIN_ID = 84532; // Base Sepolia

// CreditSpend struct matching the Solidity contract
interface CreditSpend {
  spender: `0x${string}`;
  amount: bigint | string;
  activityId: bigint | string;
  nonce: bigint | string;
  deadline: bigint | string;
}

// ABI for CreditToken spendCredits
const CREDIT_TOKEN_SPEND_ABI: Abi = [
  {
    type: "function",
    name: "spendCredits",
    inputs: [
      {
        name: "spend",
        type: "tuple",
        components: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "activityId", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

export async function POST(request: NextRequest) {
  try {
    const { spend, signature, contractAddress } = await request.json();

    // Validate inputs
    if (!spend || !signature) {
      return NextResponse.json({ error: "Missing required fields: spend, signature" }, { status: 400 });
    }

    const { spender, amount, activityId, nonce, deadline } = spend as CreditSpend;

    if (!spender) {
      return NextResponse.json({ error: "Invalid spend: missing spender" }, { status: 400 });
    }

    if (!isAddress(spender)) {
      return NextResponse.json({ error: "Invalid address format for spender" }, { status: 400 });
    }

    // Get relayer private key
    const relayerKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerKey) {
      return NextResponse.json({ error: "Relayer not configured" }, { status: 500 });
    }

    // Get contract address - either from deployedContracts or request body
    const chainContracts = deployedContracts[CHAIN_ID] as Record<string, { address: string }> | undefined;
    const creditTokenAddress = chainContracts?.CreditToken?.address || contractAddress;

    if (!creditTokenAddress || !isAddress(creditTokenAddress)) {
      return NextResponse.json(
        { error: "CreditToken not deployed. Provide contractAddress in request body." },
        { status: 500 },
      );
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

    // Prepare spend tuple
    const spendTuple = {
      spender: spender as `0x${string}`,
      amount: BigInt(amount),
      activityId: BigInt(activityId),
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
    };

    // Submit transaction
    const hash = await walletClient.writeContract({
      address: creditTokenAddress as `0x${string}`,
      abi: CREDIT_TOKEN_SPEND_ABI,
      functionName: "spendCredits",
      args: [spendTuple, signature],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      creditsSpent: amount.toString(),
      activityId: activityId.toString(),
    });
  } catch (error) {
    console.error("Relay credit spend error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

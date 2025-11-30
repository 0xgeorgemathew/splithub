import { NextRequest, NextResponse } from "next/server";
import { Abi, encodeFunctionData } from "viem";
import { createPublicClient, createWalletClient, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";

const CHAIN_ID = 84532; // Base Sepolia

// Multicall3 address (same on all chains)
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

// PaymentAuth struct
interface PaymentAuth {
  payer: `0x${string}`;
  recipient: `0x${string}`;
  token: `0x${string}`;
  amount: string;
  nonce: string;
  deadline: string;
  signature: string;
}

// ABI for SplitHubPayments executePayment
const SPLIT_HUB_PAYMENTS_ABI: Abi = [
  {
    type: "function",
    name: "executePayment",
    inputs: [
      {
        name: "auth",
        type: "tuple",
        components: [
          { name: "payer", type: "address" },
          { name: "recipient", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
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

// Multicall3 ABI for aggregate3
const MULTICALL3_ABI: Abi = [
  {
    type: "function",
    name: "aggregate3",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      {
        name: "returnData",
        type: "tuple[]",
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
      },
    ],
    stateMutability: "payable",
  },
];

export async function POST(request: NextRequest) {
  try {
    const { payments, contractAddress } = await request.json();

    // Validate inputs
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json({ error: "Missing or empty payments array" }, { status: 400 });
    }

    // Validate each payment
    for (const payment of payments as PaymentAuth[]) {
      const { payer, recipient, token, amount, nonce, deadline, signature } = payment;

      if (!payer || !recipient || !token || !amount || !nonce || !deadline || !signature) {
        return NextResponse.json({ error: "Invalid payment: missing required fields" }, { status: 400 });
      }

      if (!isAddress(payer) || !isAddress(recipient) || !isAddress(token)) {
        return NextResponse.json({ error: "Invalid address format in payment" }, { status: 400 });
      }
    }

    // Get relayer private key
    const relayerKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerKey) {
      return NextResponse.json({ error: "Relayer not configured" }, { status: 500 });
    }

    // Get contract address
    const chainContracts = deployedContracts[CHAIN_ID] as Record<string, { address: string }> | undefined;
    const paymentsAddress = chainContracts?.SplitHubPayments?.address || contractAddress;

    if (!paymentsAddress || !isAddress(paymentsAddress)) {
      return NextResponse.json(
        { error: "SplitHubPayments not deployed. Provide contractAddress in request body." },
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

    // Build multicall calls array
    const calls = (payments as PaymentAuth[]).map(payment => {
      const authTuple = {
        payer: payment.payer,
        recipient: payment.recipient,
        token: payment.token,
        amount: BigInt(payment.amount),
        nonce: BigInt(payment.nonce),
        deadline: BigInt(payment.deadline),
      };

      const callData = encodeFunctionData({
        abi: SPLIT_HUB_PAYMENTS_ABI,
        functionName: "executePayment",
        args: [authTuple, payment.signature],
      });

      return {
        target: paymentsAddress as `0x${string}`,
        allowFailure: false, // Fail entire batch if any call fails
        callData,
      };
    });

    // Execute batch via Multicall3
    const hash = await walletClient.writeContract({
      address: MULTICALL3_ADDRESS,
      abi: MULTICALL3_ABI,
      functionName: "aggregate3",
      args: [calls],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      paymentsCount: payments.length,
    });
  } catch (error) {
    console.error("Batch relay payment error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

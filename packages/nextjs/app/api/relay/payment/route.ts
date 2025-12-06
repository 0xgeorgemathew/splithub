import { NextRequest, NextResponse } from "next/server";
import { Abi, formatUnits } from "viem";
import { createPublicClient, createWalletClient, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";

const CHAIN_ID = 84532; // Base Sepolia

// PaymentAuth struct matching the Solidity contract
interface PaymentAuth {
  payer: `0x${string}`;
  recipient: `0x${string}`;
  token: `0x${string}`;
  amount: bigint | string;
  nonce: bigint | string;
  deadline: bigint | string;
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
  {
    type: "error",
    name: "InvalidSignature",
    inputs: [],
  },
  {
    type: "error",
    name: "UnauthorizedSigner",
    inputs: [],
  },
  {
    type: "error",
    name: "ExpiredSignature",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidNonce",
    inputs: [],
  },
];

export async function POST(request: NextRequest) {
  try {
    const { auth, signature, contractAddress } = await request.json();

    // Validate inputs
    if (!auth || !signature) {
      return NextResponse.json({ error: "Missing required fields: auth, signature" }, { status: 400 });
    }

    const { payer, recipient, token, amount, nonce, deadline } = auth as PaymentAuth;

    if (!payer || !recipient || !token) {
      return NextResponse.json({ error: "Invalid auth: missing payer, recipient, or token" }, { status: 400 });
    }

    if (!isAddress(payer) || !isAddress(recipient) || !isAddress(token)) {
      return NextResponse.json({ error: "Invalid address format in auth" }, { status: 400 });
    }

    // Get relayer private key
    const relayerKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerKey) {
      return NextResponse.json({ error: "Relayer not configured" }, { status: 500 });
    }

    // Get contract address - either from deployedContracts or request body
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

    // Prepare auth tuple
    const authTuple = {
      payer: payer as `0x${string}`,
      recipient: recipient as `0x${string}`,
      token: token as `0x${string}`,
      amount: BigInt(amount),
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
    };

    // Submit transaction
    console.log("Submitting transaction to SplitHubPayments contract:", paymentsAddress);
    console.log("Payment details:", {
      payer: authTuple.payer,
      recipient: authTuple.recipient,
      token: authTuple.token,
      amount: authTuple.amount.toString(),
    });

    const hash = await walletClient.writeContract({
      address: paymentsAddress as `0x${string}`,
      abi: SPLIT_HUB_PAYMENTS_ABI,
      functionName: "executePayment",
      args: [authTuple, signature],
    });

    console.log("Transaction submitted! Hash:", hash);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log("Transaction confirmed! Block:", receipt.blockNumber.toString());

    // Circle Auto-Split: Check if payer has an active Circle
    // Using dynamic imports to prevent module-level loading issues
    let circleSplitResult = null;
    try {
      // Dynamic imports to avoid affecting other routes if Circle tables don't exist
      const { getActiveCircle, getCircleMembers } = await import("~~/services/circleService");
      const { createExpense } = await import("~~/services/expenseService");
      const { supabase } = await import("~~/lib/supabase");

      const activeCircle = await getActiveCircle(payer);

      if (activeCircle) {
        console.log("Active Circle found:", activeCircle.name);

        const members = await getCircleMembers(activeCircle.id);
        console.log("Circle members:", members.length);

        if (members.length > 0) {
          // Calculate split amount: original amount / (members + payer)
          const amountBigInt = BigInt(amount);
          const totalParticipants = members.length + 1; // members + payer
          const splitAmountWei = amountBigInt / BigInt(totalParticipants);

          // Convert to human-readable format (assuming 6 decimals for USDC)
          const splitAmountFormatted = formatUnits(splitAmountWei, 6);
          const totalAmountFormatted = parseFloat(formatUnits(amountBigInt, 6));

          console.log(`Split: ${formatUnits(amountBigInt, 6)} / ${totalParticipants} = ${splitAmountFormatted} each`);

          // Create expense record so balances update
          const participantWallets = [payer.toLowerCase(), ...members.map(m => m.wallet_address.toLowerCase())];
          try {
            const expenseResult = await createExpense({
              creatorWallet: payer.toLowerCase(),
              description: `Circle: ${activeCircle.name}`,
              totalAmount: totalAmountFormatted,
              tokenAddress: token.toLowerCase(),
              participantWallets,
            });
            console.log("Expense created:", expenseResult.expense.id);
          } catch (expenseError) {
            console.error("Failed to create expense (non-critical):", expenseError);
          }

          // Get payer's user info for the memo
          const { data: payerUser } = await supabase
            .from("users")
            .select("name, twitter_handle")
            .eq("wallet_address", payer.toLowerCase())
            .single();

          // Create payment requests for each Circle member
          const paymentRequests = [];
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

          for (const member of members) {
            // Skip if somehow the member is the payer
            if (member.wallet_address.toLowerCase() === payer.toLowerCase()) continue;

            const { data: request, error: requestError } = await supabase
              .from("payment_requests")
              .insert({
                payer: member.wallet_address.toLowerCase(),
                recipient: payer.toLowerCase(),
                token: token.toLowerCase(),
                amount: splitAmountFormatted,
                memo: `Circle split: ${activeCircle.name}`,
                status: "pending",
                expires_at: expiresAt,
                payer_twitter: member.twitter_handle || null,
                requester_twitter: payerUser?.twitter_handle || null,
              })
              .select()
              .single();

            if (requestError) {
              console.error(`Failed to create payment request for ${member.wallet_address}:`, requestError);
            } else {
              paymentRequests.push(request);
              console.log(`Payment request created for ${member.name || member.wallet_address}`);
            }
          }

          circleSplitResult = {
            circleName: activeCircle.name,
            membersNotified: paymentRequests.length,
            splitAmount: splitAmountFormatted,
          };
        }
      }
    } catch (circleError) {
      // Circle split is non-critical, log but don't fail the payment
      console.error("Circle auto-split error (non-critical):", circleError);
    }

    return NextResponse.json({
      success: true,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      circleSplit: circleSplitResult,
    });
  } catch (error: any) {
    console.error("Relay payment error:", error);

    // Extract more specific error message
    let message = "Unknown error";
    if (error instanceof Error) {
      message = error.message;

      // Check for specific contract errors
      if (message.includes("UnauthorizedSigner")) {
        message = "Unauthorized signer: The NFC chip is not registered to this wallet";
      } else if (message.includes("InvalidNonce")) {
        message = "Invalid nonce: Transaction out of order or already processed";
      } else if (message.includes("ExpiredSignature")) {
        message = "Signature expired: Please try again";
      } else if (message.includes("InvalidSignature")) {
        message = "Invalid signature: Signature verification failed";
      } else if (message.includes("ERC20: insufficient allowance")) {
        message = "Insufficient token allowance: Please approve the contract to spend your tokens";
      } else if (message.includes("ERC20: transfer amount exceeds balance")) {
        message = "Insufficient balance: You don't have enough tokens";
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

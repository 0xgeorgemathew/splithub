import { NextRequest, NextResponse } from "next/server";
import { Abi, formatUnits } from "viem";
import { createPublicClient, createWalletClient, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { TOKENS } from "~~/config/tokens";
import deployedContracts from "~~/contracts/deployedContracts";

const CHAIN_ID = 84532; // Base Sepolia

// CreditPurchase struct matching the Solidity contract
interface CreditPurchase {
  buyer: `0x${string}`;
  usdcAmount: bigint | string;
  nonce: bigint | string;
  deadline: bigint | string;
}

// ABI for CreditToken purchaseCredits
const CREDIT_TOKEN_PURCHASE_ABI: Abi = [
  {
    type: "function",
    name: "purchaseCredits",
    inputs: [
      {
        name: "purchase",
        type: "tuple",
        components: [
          { name: "buyer", type: "address" },
          { name: "usdcAmount", type: "uint256" },
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
    const { purchase, signature, contractAddress } = await request.json();

    // Validate inputs
    if (!purchase || !signature) {
      return NextResponse.json({ error: "Missing required fields: purchase, signature" }, { status: 400 });
    }

    const { buyer, usdcAmount, nonce, deadline } = purchase as CreditPurchase;

    if (!buyer) {
      return NextResponse.json({ error: "Invalid purchase: missing buyer" }, { status: 400 });
    }

    if (!isAddress(buyer)) {
      return NextResponse.json({ error: "Invalid address format for buyer" }, { status: 400 });
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

    // Prepare purchase tuple
    const purchaseTuple = {
      buyer: buyer as `0x${string}`,
      usdcAmount: BigInt(usdcAmount),
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
    };

    // Submit transaction
    const hash = await walletClient.writeContract({
      address: creditTokenAddress as `0x${string}`,
      abi: CREDIT_TOKEN_PURCHASE_ABI,
      functionName: "purchaseCredits",
      args: [purchaseTuple, signature],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Calculate credits minted (1 USDC = 10 credits)
    // USDC has 6 decimals, credits have 18 decimals
    const creditsMinted = (BigInt(usdcAmount) * BigInt(10) * BigInt(10 ** 18)) / BigInt(10 ** 6);

    console.log("Credit purchase confirmed! Block:", receipt.blockNumber.toString());

    // Circle Auto-Split: Check if buyer has an active Circle
    // Using dynamic imports to prevent module-level loading issues
    let circleSplitResult = null;
    try {
      const { getActiveCircle, getCircleMembers } = await import("~~/services/circleService");
      const { createExpense } = await import("~~/services/expenseService");

      const activeCircle = await getActiveCircle(buyer);

      if (activeCircle) {
        console.log("Active Circle found:", activeCircle.name);

        const members = await getCircleMembers(activeCircle.id);
        console.log("Circle members:", members.length);

        if (members.length > 0) {
          // Split USDC amount among Circle members (not credits)
          const amountBigInt = BigInt(usdcAmount);
          const totalParticipants = members.length + 1; // members + buyer
          const splitAmountWei = amountBigInt / BigInt(totalParticipants);

          // Convert to human-readable format (USDC has 6 decimals)
          const splitAmountFormatted = formatUnits(splitAmountWei, 6);
          const totalAmountFormatted = parseFloat(formatUnits(amountBigInt, 6));

          console.log(
            `Split: ${formatUnits(amountBigInt, 6)} USDC / ${totalParticipants} = ${splitAmountFormatted} each`,
          );

          // Get USDC token address from centralized config
          const usdcAddress = TOKENS.USDC;

          // Create expense record so balances update
          const participantWallets = [buyer.toLowerCase(), ...members.map(m => m.wallet_address.toLowerCase())];
          try {
            const expenseResult = await createExpense({
              creatorWallet: buyer.toLowerCase(),
              description: `Circle: ${activeCircle.name} (credits)`,
              totalAmount: totalAmountFormatted,
              tokenAddress: usdcAddress.toLowerCase(),
              participantWallets,
            });
            console.log("Expense created:", expenseResult.expense.id);

            circleSplitResult = {
              circleName: activeCircle.name,
              memberCount: members.length,
              splitAmount: splitAmountFormatted,
              expenseId: expenseResult.expense.id,
            };
          } catch (expenseError) {
            console.error("Failed to create expense (non-critical):", expenseError);
          }
        }
      }
    } catch (circleError) {
      // Circle split is non-critical, log but don't fail the purchase
      console.error("Circle auto-split error (non-critical):", circleError);
    }

    return NextResponse.json({
      success: true,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      creditsMinted: creditsMinted.toString(),
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice?.toString() || "0",
      network: "Base Sepolia",
      chainId: CHAIN_ID,
      circleSplit: circleSplitResult,
    });
  } catch (error) {
    console.error("Relay credit purchase error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { encodeFunctionData, parseUnits } from "viem";
import { TOKENS, TOKEN_DECIMALS } from "~~/config/tokens";
import { createFreshBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { ERC20_ABI } from "~~/lib/contractAbis";
import {
  getVincentAgentAccount,
  getVincentConfigFromEnv,
  vincentSendTransaction,
  vincentTransferToken,
} from "~~/lib/vincent";

/**
 * Aave v3 Pool on Base Sepolia
 * From tx reference: 0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27
 */
const AAVE_POOL_ADDRESS = "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27" as const;

/**
 * Aave v3 Pool ABI — only the functions we need
 */
const AAVE_POOL_ABI = [
  {
    type: "function",
    name: "supply",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  vincentStatus?: "executed" | "denied" | "pending_approval";
  error?: string;
}

export async function waitForConfirmedBaseTransaction(txHash: string): Promise<void> {
  const client = createFreshBaseSepoliaPublicClient();
  const receipt = await client.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

  if (receipt.status !== "success") {
    throw new Error(`Transaction ${txHash} failed on-chain`);
  }
}

/**
 * Execute an Aave supply through Vincent.
 *
 * SplitHub encodes the calldata locally, then Vincent signs and submits
 * the transaction from the shared smart account.
 */
export async function executeAaveSupply(amount: string): Promise<ExecutionResult> {
  const config = getVincentConfigFromEnv();
  const account = await getVincentAgentAccount(config);
  const client = createFreshBaseSepoliaPublicClient();
  const amountWei = parseUnits(amount, TOKEN_DECIMALS.USDC);

  const currentAllowance = await client.readContract({
    address: TOKENS.USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account.smartAccountAddress as `0x${string}`, AAVE_POOL_ADDRESS],
  });

  try {
    if ((currentAllowance as bigint) < amountWei) {
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AAVE_POOL_ADDRESS, amountWei],
      });

      const approval = await vincentSendTransaction(config, {
        to: TOKENS.USDC,
        data: approveData,
        value: "0",
      });

      if (approval.status !== "executed") {
        return {
          success: false,
          txHash: approval.txHash,
          vincentStatus: approval.status,
          error:
            approval.status === "denied"
              ? "Approval denied by Vincent policy"
              : "Approval requires Vincent dashboard action",
        };
      }
    }

    const supplyData = encodeFunctionData({
      abi: AAVE_POOL_ABI,
      functionName: "supply",
      args: [TOKENS.USDC, amountWei, account.smartAccountAddress as `0x${string}`, 0],
    });

    const result = await vincentSendTransaction(config, {
      to: AAVE_POOL_ADDRESS,
      data: supplyData,
      value: "0",
    });

    return {
      success: result.status === "executed",
      txHash: result.txHash,
      vincentStatus: result.status,
      error:
        result.status === "denied"
          ? "Action denied by Vincent policy"
          : result.status === "pending_approval"
          ? "Action requires approval in Vincent dashboard"
          : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Execution failed",
    };
  }
}

/**
 * Execute an Aave withdraw through Vincent.
 *
 * Withdraws USDC from Aave back to the shared smart account.
 */
export async function executeAaveWithdraw(amount: string): Promise<ExecutionResult> {
  const config = getVincentConfigFromEnv();
  const account = await getVincentAgentAccount(config);
  const amountWei = parseUnits(amount, TOKEN_DECIMALS.USDC);

  const data = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: "withdraw",
    args: [TOKENS.USDC, amountWei, account.smartAccountAddress as `0x${string}`],
  });

  try {
    const result = await vincentSendTransaction(config, {
      to: AAVE_POOL_ADDRESS,
      data,
      value: "0",
    });

    return {
      success: result.status === "executed",
      txHash: result.txHash,
      vincentStatus: result.status,
      error:
        result.status === "denied"
          ? "Action denied by Vincent policy"
          : result.status === "pending_approval"
          ? "Action requires approval in Vincent dashboard"
          : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Execution failed",
    };
  }
}

export async function executeAgentTokenTransfer(to: string, amount: string): Promise<ExecutionResult> {
  const config = getVincentConfigFromEnv();

  try {
    const result = await vincentTransferToken(config, {
      to,
      token: TOKENS.USDC,
      amount,
    });

    return {
      success: result.status === "executed",
      txHash: result.txHash,
      vincentStatus: result.status,
      error:
        result.status === "denied"
          ? "Transfer denied by Vincent policy"
          : result.status === "pending_approval"
          ? "Transfer requires approval in Vincent dashboard"
          : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transfer failed",
    };
  }
}

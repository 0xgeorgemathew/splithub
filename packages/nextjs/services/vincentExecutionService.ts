import { encodeFunctionData, formatUnits, maxUint256, parseUnits, serializeTransaction } from "viem";
import { TOKENS, TOKEN_DECIMALS } from "~~/config/tokens";
import { baseSepolia, createFreshBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { ERC20_ABI } from "~~/lib/contractAbis";
import { type VincentAppUserContext, getVincentAbilityClients, getVincentRegistryRpcUrl } from "~~/lib/vincent";

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

export type VincentExecutionContext = Pick<VincentAppUserContext, "pkpAddress" | "agentAddress">;

function getAbilityContext(context: VincentExecutionContext) {
  return {
    delegatorPkpEthAddress: context.pkpAddress,
    agentAddress: context.agentAddress,
    registryRpcUrl: getVincentRegistryRpcUrl(),
    pkpInfoRpcUrl: getVincentRegistryRpcUrl(),
  };
}

function toExecutionError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toAbilityFailure(response: unknown, fallback: string): ExecutionResult {
  const maybeResponse = response as { success?: boolean; runtimeError?: string; result?: { error?: string } } | null;
  if (maybeResponse?.success === false) {
    return {
      success: false,
      error: maybeResponse.runtimeError || maybeResponse.result?.error || fallback,
    };
  }

  return {
    success: false,
    error: fallback,
  };
}

export async function waitForConfirmedBaseTransaction(txHash: string): Promise<void> {
  const client = createFreshBaseSepoliaPublicClient();
  const receipt = await client.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

  if (receipt.status !== "success") {
    throw new Error(`Transaction ${txHash} failed on-chain`);
  }
}

async function signAndBroadcastTransaction(params: {
  context: VincentExecutionContext;
  to: `0x${string}`;
  data: `0x${string}`;
  value?: bigint;
}): Promise<ExecutionResult> {
  const client = createFreshBaseSepoliaPublicClient();
  const { transactionSigner } = await getVincentAbilityClients();
  const account = params.context.pkpAddress as `0x${string}`;
  const value = params.value ?? 0n;

  const [nonce, gasEstimate, feeEstimate] = await Promise.all([
    client.getTransactionCount({ address: account }),
    client.estimateGas({
      account,
      to: params.to,
      data: params.data,
      value,
    }),
    client.estimateFeesPerGas(),
  ]);

  const gasLimit = (gasEstimate * 12n) / 10n;
  const maxPriorityFeePerGas = feeEstimate.maxPriorityFeePerGas ?? 1_000_000_000n;
  const maxFeePerGas = feeEstimate.maxFeePerGas ?? feeEstimate.gasPrice ?? maxPriorityFeePerGas * 2n;
  const serializedTransaction = serializeTransaction({
    chainId: baseSepolia.id,
    type: "eip1559",
    to: params.to,
    data: params.data,
    nonce,
    value,
    gas: gasLimit,
    maxPriorityFeePerGas,
    maxFeePerGas,
  });

  const signedResult = await transactionSigner.execute({ serializedTransaction }, getAbilityContext(params.context));

  if ((signedResult as { success?: boolean })?.success === false) {
    return toAbilityFailure(signedResult, "Vincent transaction signer failed");
  }

  const signedTransaction = signedResult.result.signedTransaction as `0x${string}`;
  const signedTransactionHash = signedResult.result.deserializedSignedTransaction?.hash as `0x${string}` | undefined;

  let lastBroadcastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const txHash = await client.sendRawTransaction({
        serializedTransaction: signedTransaction,
      });

      return {
        success: true,
        txHash,
        vincentStatus: "executed",
      };
    } catch (error) {
      const message = toExecutionError(error, "Transaction broadcast failed");
      if (
        signedTransactionHash &&
        (message.includes("already known") || message.includes("nonce too low") || message.includes("replacement transaction underpriced"))
      ) {
        return {
          success: true,
          txHash: signedTransactionHash,
          vincentStatus: "executed",
        };
      }

      lastBroadcastError = error;
      if (attempt < 2) {
        await sleep(400 * (attempt + 1));
      }
    }
  }

  throw lastBroadcastError instanceof Error ? lastBroadcastError : new Error("Transaction broadcast failed");
}

async function ensureUsdcApproval(context: VincentExecutionContext, amountWei: bigint): Promise<ExecutionResult> {
  const client = createFreshBaseSepoliaPublicClient();
  const { approval } = await getVincentAbilityClients();

  const currentAllowance = await client.readContract({
    address: TOKENS.USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [context.pkpAddress as `0x${string}`, AAVE_POOL_ADDRESS],
  });

  try {
    if ((currentAllowance as bigint) < amountWei) {
      const approvalResult = await approval.execute(
        {
          rpcUrl: getVincentRegistryRpcUrl(),
          chainId: baseSepolia.id,
          spenderAddress: AAVE_POOL_ADDRESS,
          tokenAddress: TOKENS.USDC,
          tokenAmount: maxUint256.toString(),
        },
        getAbilityContext(context),
      );

      if ((approvalResult as { success?: boolean })?.success === false) {
        return toAbilityFailure(approvalResult, "Vincent approval failed");
      }

      const approvalTxHash = approvalResult.result.approvalTxHash as string | undefined;
      if (approvalTxHash) {
        await waitForConfirmedBaseTransaction(approvalTxHash);
      }

      return {
        success: true,
        txHash: approvalTxHash,
        vincentStatus: "executed",
      };
    }

    return {
      success: true,
      vincentStatus: "executed",
    };
  } catch (error) {
    return {
      success: false,
      error: toExecutionError(error, "Approval failed"),
    };
  }
}

export async function executeAaveSupply(context: VincentExecutionContext, amount: string): Promise<ExecutionResult> {
  const amountWei = parseUnits(amount, TOKEN_DECIMALS.USDC);
  const approvalResult = await ensureUsdcApproval(context, amountWei);
  if (!approvalResult.success) {
    return approvalResult;
  }

  const data = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: "supply",
    args: [TOKENS.USDC, amountWei, context.pkpAddress as `0x${string}`, 0],
  });

  try {
    return await signAndBroadcastTransaction({
      context,
      to: AAVE_POOL_ADDRESS,
      data,
    });
  } catch (error) {
    return {
      success: false,
      error: toExecutionError(error, "Aave supply failed"),
    };
  }
}

export async function executeAaveSupplyRaw(context: VincentExecutionContext, amountWei: bigint): Promise<ExecutionResult> {
  return executeAaveSupply(context, formatUnits(amountWei, TOKEN_DECIMALS.USDC));
}

export async function executeAaveWithdraw(context: VincentExecutionContext, amount: string): Promise<ExecutionResult> {
  const amountWei = parseUnits(amount, TOKEN_DECIMALS.USDC);

  const data = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: "withdraw",
    args: [TOKENS.USDC, amountWei, context.pkpAddress as `0x${string}`],
  });

  try {
    return await signAndBroadcastTransaction({
      context,
      to: AAVE_POOL_ADDRESS,
      data,
    });
  } catch (error) {
    return {
      success: false,
      error: toExecutionError(error, "Aave withdraw failed"),
    };
  }
}

export async function executeAaveWithdrawAll(context: VincentExecutionContext): Promise<ExecutionResult> {
  const data = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: "withdraw",
    args: [TOKENS.USDC, maxUint256, context.pkpAddress as `0x${string}`],
  });

  try {
    return await signAndBroadcastTransaction({
      context,
      to: AAVE_POOL_ADDRESS,
      data,
    });
  } catch (error) {
    return {
      success: false,
      error: toExecutionError(error, "Aave withdraw failed"),
    };
  }
}

export async function executeAgentTokenTransfer(
  context: VincentExecutionContext,
  to: string,
  amount: string,
): Promise<ExecutionResult> {
  const { transfer } = await getVincentAbilityClients();

  try {
    const result = await transfer.execute(
      {
        to,
        amount,
        tokenAddress: TOKENS.USDC,
        chain: "baseSepolia",
        rpcUrl: getVincentRegistryRpcUrl(),
      },
      getAbilityContext(context),
    );

    if ((result as { success?: boolean })?.success === false) {
      return toAbilityFailure(result, "Vincent transfer failed");
    }

    return {
      success: true,
      txHash: result.result.txHash,
      vincentStatus: "executed",
    };
  } catch (error) {
    return {
      success: false,
      error: toExecutionError(error, "Transfer failed"),
    };
  }
}

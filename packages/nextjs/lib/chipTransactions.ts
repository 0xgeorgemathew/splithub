import { type Address, encodeFunctionData, keccak256, parseUnits, serializeTransaction } from "viem";
import { baseSepolia } from "~~/lib/baseSepolia";
import { ERC20_ABI } from "~~/lib/contractAbis";

type RawChipSignature = {
  r: string;
  s: string;
  v: number;
};

type SignDigestResult = {
  address: Address;
  signature: string;
  rawSignature: RawChipSignature;
};

type ChipTransferReceipt = {
  status: string;
  blockNumber?: bigint;
};

type ChipTransferClient = {
  estimateGas: (parameters: { account: Address; to: Address; data: `0x${string}` }) => Promise<bigint>;
  getTransactionCount: (parameters: { address: Address }) => Promise<number>;
  estimateFeesPerGas: () => Promise<{ maxFeePerGas?: bigint | null; maxPriorityFeePerGas?: bigint | null }>;
  sendRawTransaction: (parameters: { serializedTransaction: `0x${string}` }) => Promise<`0x${string}`>;
  waitForTransactionReceipt: (parameters: { hash: `0x${string}` }) => Promise<ChipTransferReceipt>;
};

type PreparedChipTransfer = {
  tx: {
    type: "eip1559";
    nonce: number;
    to: Address;
    value: bigint;
    data: `0x${string}`;
    gas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    chainId: number;
  };
  digest: `0x${string}`;
};

const insufficientGasMessage = "This card needs Base Sepolia ETH for gas before it can move funds.";
const DEFAULT_ERC20_TRANSFER_GAS_LIMIT = 90_000n;

function handleChipTransferError(error: unknown): never {
  if (error instanceof Error) {
    const loweredMessage = error.message.toLowerCase();

    if (
      loweredMessage.includes("insufficient funds") ||
      loweredMessage.includes("gas required exceeds allowance") ||
      loweredMessage.includes("intrinsic gas too low")
    ) {
      throw new Error(insufficientGasMessage);
    }

    throw error;
  }

  throw new Error("Chip transfer failed");
}

export async function prepareRawChipTokenTransfer({
  publicClient,
  chipAddress,
  tokenAddress,
  recipient,
  amount,
  decimals,
}: {
  publicClient: ChipTransferClient;
  chipAddress: Address;
  tokenAddress: Address;
  recipient: Address;
  amount: string;
  decimals: number;
}): Promise<PreparedChipTransfer> {
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [recipient, parseUnits(amount, decimals)],
  });

  const nonce = await publicClient.getTransactionCount({ address: chipAddress });
  const feeData = await publicClient.estimateFeesPerGas();

  const tx = {
    type: "eip1559" as const,
    nonce,
    to: tokenAddress,
    value: 0n,
    data,
    // Keep the tap flow independent of the current token balance.
    // The chip signs an optimistic ERC-20 transfer first, then Vincent can
    // top up the token balance before this transaction is broadcast.
    gas: DEFAULT_ERC20_TRANSFER_GAS_LIMIT,
    maxFeePerGas: feeData.maxFeePerGas ?? 1_000_000_000n,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 1_000_000n,
    chainId: baseSepolia.id,
  };

  return {
    tx,
    digest: keccak256(serializeTransaction(tx)),
  };
}

export async function broadcastSignedChipTransaction({
  publicClient,
  chipAddress,
  prepared,
  signed,
}: {
  publicClient: ChipTransferClient;
  chipAddress: Address;
  prepared: PreparedChipTransfer;
  signed: SignDigestResult;
}): Promise<{ txHash: `0x${string}`; signerAddress: Address; receipt: ChipTransferReceipt }> {
  if (signed.address.toLowerCase() !== chipAddress.toLowerCase()) {
    throw new Error("Please use the same registered card for this transfer.");
  }

  const signedTx = serializeTransaction(prepared.tx, {
    r: `0x${signed.rawSignature.r}`,
    s: `0x${signed.rawSignature.s}`,
    v: BigInt(signed.rawSignature.v),
  });

  const txHash = await publicClient
    .sendRawTransaction({
      serializedTransaction: signedTx,
    })
    .catch(handleChipTransferError);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash }).catch(handleChipTransferError);

  if (receipt.status !== "success") {
    throw new Error("Chip transfer failed on-chain");
  }

  return {
    txHash,
    signerAddress: signed.address,
    receipt,
  };
}

export async function broadcastRawChipTokenTransfer({
  publicClient,
  chipAddress,
  tokenAddress,
  recipient,
  amount,
  decimals,
  signDigest,
}: {
  publicClient: ChipTransferClient;
  chipAddress: Address;
  tokenAddress: Address;
  recipient: Address;
  amount: string;
  decimals: number;
  signDigest: ({ digest }: { digest: `0x${string}` }) => Promise<SignDigestResult>;
}): Promise<{ txHash: `0x${string}`; signerAddress: Address; receipt: ChipTransferReceipt }> {
  const prepared = await prepareRawChipTokenTransfer({
    publicClient,
    chipAddress,
    tokenAddress,
    recipient,
    amount,
    decimals,
  });
  const signed = await signDigest({ digest: prepared.digest });
  return broadcastSignedChipTransaction({
    publicClient,
    chipAddress,
    prepared,
    signed,
  });
}

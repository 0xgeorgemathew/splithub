/**
 * Tap-to-pay primitives shared by every payment surface (splits, settle, stores, venue stalls).
 *
 * The Halo chip only authorizes: it signs an EIP-712 PaymentAuth, and SplitHubPayments pulls the funds
 * from the chip owner's wallet (approved during onboarding). Whichever wallet is signed in on the
 * device submits executePayment, so no relayer or server key is involved.
 */
import { type Address, type Hex, decodeEventLog, isAddressEqual, zeroAddress } from "viem";
import { PAYMENT_DEADLINE } from "~~/config/tokens";
import deployedContracts from "~~/contracts/deployedContracts";
import type { createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { SPLIT_HUB_PAYMENTS_ABI, SPLIT_HUB_REGISTRY_ABI } from "~~/lib/contractAbis";

export const TAP_CHAIN_ID = 84532;

type PublicClient = ReturnType<typeof createBaseSepoliaPublicClient>;

const chainContracts = deployedContracts[TAP_CHAIN_ID] as Record<string, { address: Address }>;
export const PAYMENTS_ADDRESS = chainContracts.SplitHubPayments.address;
export const REGISTRY_ADDRESS = chainContracts.SplitHubRegistry.address;

export type PaymentAuth = {
  payer: Address;
  recipient: Address;
  token: Address;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
};

export const PAYMENT_AUTH_TYPED_DATA = {
  domain: {
    name: "SplitHubPayments",
    version: "1",
    chainId: BigInt(TAP_CHAIN_ID),
    verifyingContract: PAYMENTS_ADDRESS,
  },
  types: {
    PaymentAuth: [
      { name: "payer", type: "address" },
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  },
  primaryType: "PaymentAuth",
} as const;

/** Wallet that owns a chip in SplitHubRegistry; throws if the chip is not registered. */
export async function resolveChipOwner(publicClient: PublicClient, chipAddress: Address): Promise<Address> {
  const owner = (await publicClient.readContract({
    address: REGISTRY_ADDRESS,
    abi: SPLIT_HUB_REGISTRY_ABI,
    functionName: "ownerOf",
    args: [chipAddress],
  })) as Address;
  if (!owner || isAddressEqual(owner, zeroAddress)) {
    throw new Error("This chip is not registered yet. Register it in SplitHub first.");
  }
  return owner;
}

export async function buildPaymentAuth(
  publicClient: PublicClient,
  params: { payer: Address; recipient: Address; token: Address; amount: bigint },
): Promise<PaymentAuth> {
  const nonce = (await publicClient.readContract({
    address: PAYMENTS_ADDRESS,
    abi: SPLIT_HUB_PAYMENTS_ABI,
    functionName: "nonces",
    args: [params.payer],
  })) as bigint;
  return {
    ...params,
    nonce,
    deadline: BigInt(Math.floor(Date.now() / 1000) + PAYMENT_DEADLINE.SECONDS),
  };
}

export type VerifiedPayment = {
  payer: Address;
  recipient: Address;
  token: Address;
  amount: bigint;
  signer: Address;
};

/**
 * Confirms that `txHash` executed a SplitHubPayments payment matching `expected`. Used by server routes
 * before they record an order or stall payment, so a client cannot claim a payment that never happened.
 */
export async function verifyPaymentTx(
  publicClient: PublicClient,
  txHash: Hex,
  expected: { recipient: Address; token: Address; amount?: bigint; payer?: Address },
): Promise<VerifiedPayment> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("Payment transaction reverted");
  }
  for (const log of receipt.logs) {
    if (!isAddressEqual(log.address, PAYMENTS_ADDRESS)) continue;
    try {
      const { eventName, args } = decodeEventLog({ abi: SPLIT_HUB_PAYMENTS_ABI, data: log.data, topics: log.topics });
      if (eventName !== "PaymentExecuted") continue;
      if (
        isAddressEqual(args.recipient, expected.recipient) &&
        isAddressEqual(args.token, expected.token) &&
        (expected.amount === undefined || args.amount === expected.amount) &&
        (!expected.payer || isAddressEqual(args.payer, expected.payer))
      ) {
        return args;
      }
    } catch {
      // Not a SplitHubPayments event.
    }
  }
  throw new Error("Transaction does not contain the expected payment");
}

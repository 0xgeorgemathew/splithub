/**
 * Venue credits: the closed loop behind every venue.
 *
 * A guest tops up a venue's credits with USDC and spends them at that venue's stalls, each step a chip-signed
 * EIP-712 authorization that the device wallet submits to VenueCredits. Credits only exist inside their venue:
 * they cannot be transferred, and the venue owner can withdraw only the USDC guests have already spent.
 */
import { type Address, type Hex, decodeEventLog, formatUnits, isAddressEqual, parseUnits } from "viem";
import { PAYMENT_DEADLINE } from "~~/config/tokens";
import deployedContracts from "~~/contracts/deployedContracts";
import type { createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { TAP_CHAIN_ID } from "~~/lib/tapPayment";

type PublicClient = ReturnType<typeof createBaseSepoliaPublicClient>;

const venueCreditsContract = deployedContracts[TAP_CHAIN_ID].VenueCredits;
export const VENUE_CREDITS_ADDRESS = venueCreditsContract.address as Address;
export const VENUE_CREDITS_ABI = venueCreditsContract.abi;

/** Credits use 6 decimals, like USDC. */
export const CREDIT_DECIMALS = 6;
export const CREDITS_PER_USDC = 10;

export const parseCredits = (credits: number | string) => parseUnits(String(credits), CREDIT_DECIMALS);
export const formatCredits = (units: bigint) => Number(formatUnits(units, CREDIT_DECIMALS));
export const usdcToCredits = (usdc: number) => usdc * CREDITS_PER_USDC;

const domain = {
  name: "VenueCredits",
  version: "1",
  chainId: BigInt(TAP_CHAIN_ID),
  verifyingContract: VENUE_CREDITS_ADDRESS,
} as const;

export type CreditPurchase = {
  venueId: bigint;
  buyer: Address;
  usdcAmount: bigint;
  nonce: bigint;
  deadline: bigint;
};

export type CreditSpend = {
  venueId: bigint;
  spender: Address;
  amount: bigint;
  stallId: bigint;
  nonce: bigint;
  deadline: bigint;
};

export const CREDIT_PURCHASE_TYPED_DATA = {
  domain,
  types: {
    CreditPurchase: [
      { name: "venueId", type: "uint256" },
      { name: "buyer", type: "address" },
      { name: "usdcAmount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  },
  primaryType: "CreditPurchase",
} as const;

export const CREDIT_SPEND_TYPED_DATA = {
  domain,
  types: {
    CreditSpend: [
      { name: "venueId", type: "uint256" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "stallId", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  },
  primaryType: "CreditSpend",
} as const;

export async function getVenueCreditsNonce(publicClient: PublicClient, guest: Address): Promise<bigint> {
  return publicClient.readContract({
    address: VENUE_CREDITS_ADDRESS,
    abi: VENUE_CREDITS_ABI,
    functionName: "nonces",
    args: [guest],
  });
}

export function creditDeadline() {
  return BigInt(Math.floor(Date.now() / 1000) + PAYMENT_DEADLINE.SECONDS);
}

export async function getCreditBalance(publicClient: PublicClient, chainVenueId: number, guest: Address) {
  return publicClient.readContract({
    address: VENUE_CREDITS_ADDRESS,
    abi: VENUE_CREDITS_ABI,
    functionName: "creditsOf",
    args: [BigInt(chainVenueId), guest],
  });
}

export type VenueChainState = {
  owner: Address;
  open: boolean;
  usdcBalance: bigint;
  creditsOutstanding: bigint;
  withdrawable: bigint;
};

export async function getVenueChainState(publicClient: PublicClient, chainVenueId: number): Promise<VenueChainState> {
  const id = BigInt(chainVenueId);
  const [[owner, open, usdcBalance, creditsOutstanding], withdrawable] = await Promise.all([
    publicClient.readContract({
      address: VENUE_CREDITS_ADDRESS,
      abi: VENUE_CREDITS_ABI,
      functionName: "venues",
      args: [id],
    }),
    publicClient.readContract({
      address: VENUE_CREDITS_ADDRESS,
      abi: VENUE_CREDITS_ABI,
      functionName: "withdrawable",
      args: [id],
    }),
  ]);
  return { owner, open, usdcBalance, creditsOutstanding, withdrawable };
}

/** A VenueCredits event decoded from a transaction, with the values the app records. */
export type VenueCreditEvent =
  | { kind: "created"; chainVenueId: number; owner: Address }
  | { kind: "topup"; chainVenueId: number; guest: Address; usdcAmount: bigint; credits: bigint }
  | { kind: "spend"; chainVenueId: number; guest: Address; credits: bigint; stallId: number }
  | { kind: "refund"; chainVenueId: number; guest: Address; usdcAmount: bigint; credits: bigint };

export type VerifiedVenueCreditTx = {
  events: VenueCreditEvent[];
  /** Wallet that submitted the transaction. */
  submitter: Address;
  /** Block time, in seconds. */
  timestamp: bigint;
};

/**
 * Reads the VenueCredits events from a mined transaction. Server routes record venue activity only from this,
 * never from values the client reports.
 */
export async function readVenueCreditTx(
  publicClient: PublicClient,
  txHash: Hex,
  options: { submitter?: Address; maxAgeSeconds?: number } = {},
): Promise<VerifiedVenueCreditTx> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 20_000 }).catch(() => {
    throw new Error("Transaction not found");
  });
  if (receipt.status !== "success") {
    throw new Error("Transaction reverted");
  }
  if (options.submitter && !isAddressEqual(receipt.from, options.submitter)) {
    throw new Error("This transaction was submitted by a different wallet");
  }
  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
  if (
    options.maxAgeSeconds &&
    BigInt(Math.floor(Date.now() / 1000)) - block.timestamp > BigInt(options.maxAgeSeconds)
  ) {
    throw new Error("This transaction is too old to record");
  }

  const events: VenueCreditEvent[] = [];
  for (const log of receipt.logs) {
    if (!isAddressEqual(log.address, VENUE_CREDITS_ADDRESS)) continue;
    try {
      const decoded = decodeEventLog({ abi: VENUE_CREDITS_ABI, data: log.data, topics: log.topics });
      switch (decoded.eventName) {
        case "VenueCreated":
          events.push({ kind: "created", chainVenueId: Number(decoded.args.venueId), owner: decoded.args.owner });
          break;
        case "CreditsPurchased":
          events.push({
            kind: "topup",
            chainVenueId: Number(decoded.args.venueId),
            guest: decoded.args.buyer,
            usdcAmount: decoded.args.usdcAmount,
            credits: decoded.args.credits,
          });
          break;
        case "CreditsSpent":
          events.push({
            kind: "spend",
            chainVenueId: Number(decoded.args.venueId),
            guest: decoded.args.spender,
            credits: decoded.args.amount,
            stallId: Number(decoded.args.stallId),
          });
          break;
        case "CreditsRefunded":
          events.push({
            kind: "refund",
            chainVenueId: Number(decoded.args.venueId),
            guest: decoded.args.guest,
            usdcAmount: decoded.args.usdcAmount,
            credits: decoded.args.credits,
          });
          break;
      }
    } catch {
      // Not a VenueCredits event.
    }
  }
  return { events, submitter: receipt.from, timestamp: block.timestamp };
}

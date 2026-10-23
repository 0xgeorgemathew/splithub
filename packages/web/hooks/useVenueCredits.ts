import { useCallback, useMemo } from "react";
import { type Address, type Hex, parseUnits } from "viem";
import { TOKENS, TOKEN_DECIMALS } from "~~/config/tokens";
import { DEFAULT_APPROVAL_AMOUNT } from "~~/constants/app.constants";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useEmbeddedWalletClient } from "~~/hooks/useEmbeddedWalletClient";
import { apiFetch } from "~~/lib/apiFetch";
import { baseSepolia, createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { ERC20_ABI } from "~~/lib/contractAbis";
import { resolveChipOwner } from "~~/lib/tapPayment";
import {
  CREDIT_PURCHASE_TYPED_DATA,
  CREDIT_SPEND_TYPED_DATA,
  type CreditPurchase,
  type CreditSpend,
  VENUE_CREDITS_ABI,
  VENUE_CREDITS_ADDRESS,
  creditDeadline,
  getVenueCreditsNonce,
  parseCredits,
} from "~~/lib/venueCredits";

export type VenueTapStep = "identifying" | "tapping" | "submitting" | "confirming" | "recording";

type GuestTap = {
  chainVenueId: number;
  /** Guest wallet when already known (the signed-in guest on their own phone): one tap instead of two. */
  guest?: Address;
};

/**
 * Venue credit taps (top up, spend) and the owner's on-chain venue actions. Taps work like every other
 * SplitHub payment: the chip signs, the wallet signed in on this device submits, and the server records the
 * activity only after reading the mined VenueCredits event.
 */
export function useVenueCredits() {
  const { getChipAddress, signTypedData } = useHaloChip();
  const { getWalletClient } = useEmbeddedWalletClient();
  const publicClient = useMemo(() => createBaseSepoliaPublicClient(), []);

  const submitterWallet = useCallback(
    () =>
      getWalletClient(baseSepolia).catch(() => {
        throw new Error("Sign in on this device to run the venue terminal.");
      }),
    [getWalletClient],
  );

  const identifyGuest = useCallback(
    async (guest: Address | undefined, onStep?: (step: VenueTapStep) => void) => {
      if (guest) return guest;
      onStep?.("identifying");
      const chip = await getChipAddress();
      return resolveChipOwner(publicClient, chip.address as Address);
    },
    [getChipAddress, publicClient],
  );

  const confirmAndRecord = useCallback(
    async (txHash: Hex, onStep?: (step: VenueTapStep) => void) => {
      onStep?.("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") throw new Error("The transaction failed on-chain");

      onStep?.("recording");
      const response = await apiFetch("/api/venues/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          `Confirmed on-chain (${txHash.slice(0, 10)}...), but the venue record failed: ${body?.error ?? response.status}`,
        );
      }
    },
    [publicClient],
  );

  /** Guest pays USDC from their wallet and receives the venue's credits. */
  const topUp = useCallback(
    async (
      { chainVenueId, guest, usdcAmount }: GuestTap & { usdcAmount: number },
      onStep?: (step: VenueTapStep) => void,
    ) => {
      const walletClient = await submitterWallet();
      const buyer = await identifyGuest(guest, onStep);
      const amount = parseUnits(usdcAmount.toString(), TOKEN_DECIMALS.USDC);

      const allowance = await publicClient.readContract({
        address: TOKENS.USDC,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [buyer, VENUE_CREDITS_ADDRESS],
      });
      if ((allowance as bigint) < amount) {
        throw new Error(
          "This guest has not enabled venue credits yet. They can enable them in SplitHub on the venue page.",
        );
      }

      const purchase: CreditPurchase = {
        venueId: BigInt(chainVenueId),
        buyer,
        usdcAmount: amount,
        nonce: await getVenueCreditsNonce(publicClient, buyer),
        deadline: creditDeadline(),
      };

      onStep?.("tapping");
      const { signature } = await signTypedData({ ...CREDIT_PURCHASE_TYPED_DATA, message: purchase });

      onStep?.("submitting");
      const txHash = await walletClient.writeContract({
        account: walletClient.account!,
        chain: baseSepolia,
        address: VENUE_CREDITS_ADDRESS,
        abi: VENUE_CREDITS_ABI,
        functionName: "purchaseCredits",
        args: [purchase, signature as Hex],
      });
      await confirmAndRecord(txHash, onStep);
      return { txHash, guest: buyer };
    },
    [confirmAndRecord, identifyGuest, publicClient, signTypedData, submitterWallet],
  );

  /** Guest spends credits at a stall. */
  const spend = useCallback(
    async (
      { chainVenueId, guest, credits, stallId }: GuestTap & { credits: number; stallId: number },
      onStep?: (step: VenueTapStep) => void,
    ) => {
      const walletClient = await submitterWallet();
      const spender = await identifyGuest(guest, onStep);

      const authorization: CreditSpend = {
        venueId: BigInt(chainVenueId),
        spender,
        amount: parseCredits(credits),
        stallId: BigInt(stallId),
        nonce: await getVenueCreditsNonce(publicClient, spender),
        deadline: creditDeadline(),
      };

      onStep?.("tapping");
      const { signature } = await signTypedData({ ...CREDIT_SPEND_TYPED_DATA, message: authorization });

      onStep?.("submitting");
      const txHash = await walletClient.writeContract({
        account: walletClient.account!,
        chain: baseSepolia,
        address: VENUE_CREDITS_ADDRESS,
        abi: VENUE_CREDITS_ABI,
        functionName: "spendCredits",
        args: [authorization, signature as Hex],
      });
      await confirmAndRecord(txHash, onStep);
      return { txHash, guest: spender };
    },
    [confirmAndRecord, identifyGuest, publicClient, signTypedData, submitterWallet],
  );

  /** Sends an owner transaction from the signed-in wallet and waits for it. */
  const ownerWrite = useCallback(
    async (
      call:
        | { functionName: "createVenue"; args: [] }
        | { functionName: "setVenueOpen"; args: [bigint, boolean] }
        | { functionName: "withdraw"; args: [bigint, Address] }
        | { functionName: "refundCredits"; args: [bigint, Address] },
    ) => {
      const walletClient = await getWalletClient(baseSepolia);
      const txHash = await walletClient.writeContract({
        account: walletClient.account!,
        chain: baseSepolia,
        address: VENUE_CREDITS_ADDRESS,
        abi: VENUE_CREDITS_ABI,
        ...call,
      } as Parameters<typeof walletClient.writeContract>[0]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") throw new Error("The transaction failed on-chain");
      return txHash;
    },
    [getWalletClient, publicClient],
  );

  /** One-time USDC approval so this wallet can top up venue credits. */
  const enableCredits = useCallback(async () => {
    const walletClient = await getWalletClient(baseSepolia);
    const txHash = await walletClient.writeContract({
      account: walletClient.account!,
      chain: baseSepolia,
      address: TOKENS.USDC,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [VENUE_CREDITS_ADDRESS, parseUnits(DEFAULT_APPROVAL_AMOUNT, TOKEN_DECIMALS.USDC)],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }, [getWalletClient, publicClient]);

  return { topUp, spend, ownerWrite, enableCredits, recordTx: confirmAndRecord };
}

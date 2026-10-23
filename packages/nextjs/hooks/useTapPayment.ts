"use client";

import { useCallback, useMemo } from "react";
import type { Address, Hex } from "viem";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useEmbeddedWalletClient } from "~~/hooks/useEmbeddedWalletClient";
import { baseSepolia, createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { SPLIT_HUB_PAYMENTS_ABI } from "~~/lib/contractAbis";
import {
  PAYMENTS_ADDRESS,
  PAYMENT_AUTH_TYPED_DATA,
  type PaymentAuth,
  buildPaymentAuth,
  resolveChipOwner,
} from "~~/lib/tapPayment";

export type TapPaymentRequest = {
  recipient: Address;
  token: Address;
  /** Amount in token base units. */
  amount: bigint;
  /** Payer wallet when already known (the signed-in user paying on their own phone). */
  payer?: Address;
};

export type TapPaymentStep = "identifying" | "tapping" | "submitting" | "confirming";

/**
 * Chip-authorized payment, submitted by the wallet signed in on this device.
 *
 * With a known payer it takes one tap (sign). On a merchant or venue terminal it takes two: the first
 * identifies the chip and its owner, the second signs the authorization for that owner's current nonce.
 */
export function useTapPayment() {
  const { getChipAddress, signTypedData } = useHaloChip();
  const { getWalletClient } = useEmbeddedWalletClient();
  const publicClient = useMemo(() => createBaseSepoliaPublicClient(), []);

  const pay = useCallback(
    async (request: TapPaymentRequest, onStep?: (step: TapPaymentStep) => void) => {
      let payer = request.payer;
      if (!payer) {
        onStep?.("identifying");
        const chip = await getChipAddress();
        payer = await resolveChipOwner(publicClient, chip.address as Address);
      }

      const auth: PaymentAuth = await buildPaymentAuth(publicClient, {
        payer,
        recipient: request.recipient,
        token: request.token,
        amount: request.amount,
      });

      onStep?.("tapping");
      const { signature } = await signTypedData({ ...PAYMENT_AUTH_TYPED_DATA, message: auth });

      onStep?.("submitting");
      const walletClient = await getWalletClient(baseSepolia);
      const txHash: Hex = await walletClient.writeContract({
        account: walletClient.account!,
        chain: baseSepolia,
        address: PAYMENTS_ADDRESS,
        abi: SPLIT_HUB_PAYMENTS_ABI,
        functionName: "executePayment",
        args: [auth, signature as Hex],
      });

      onStep?.("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        throw new Error("Payment failed on-chain");
      }

      return { txHash, payer, auth };
    },
    [getChipAddress, getWalletClient, publicClient, signTypedData],
  );

  return { pay };
}

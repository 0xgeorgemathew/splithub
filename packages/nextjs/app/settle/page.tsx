"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Coins, RefreshCw, User, Wallet } from "lucide-react";
import { type Address } from "viem";
import { useReadContract } from "wagmi";
import { PaymentStatus, PaymentStatusIndicator } from "~~/components/settle/PaymentStatusIndicator";
import { TOKENS } from "~~/config/tokens";
import { DEFAULT_AGENT_PAY_TEST_RECIPIENT } from "~~/constants/agentPay";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useCurrentUser } from "~~/hooks/useCurrentUser";
import { baseSepolia, createBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { dispatchClientRefreshEvents } from "~~/lib/clientTransactionUtils";
import { broadcastSignedChipTransaction, prepareRawChipTokenTransfer } from "~~/lib/chipTransactions";
import { ERC20_ABI } from "~~/lib/contractAbis";
import { parseContractError } from "~~/utils/contractErrors";

// Hardcoded values
const RECIPIENT_ADDRESS = DEFAULT_AGENT_PAY_TEST_RECIPIENT;
const DEFAULT_TOKEN_ADDRESS = TOKENS.USDC;
const DEFAULT_AMOUNT = "1";

type FlowState = "idle" | "preparing" | "tapping" | "submitting" | "confirming" | "success" | "error";

const waitForNextPaint = () =>
  new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

export default function SettlePage() {
  const { authenticated, user } = usePrivy();
  const { chipAddress } = useCurrentUser();
  const { signDigest } = useHaloChip();

  // Use Privy's authentication state instead of wagmi's useAccount
  // This properly reflects the embedded wallet connection status
  const address = user?.wallet?.address as `0x${string}` | undefined;
  const isConnected = authenticated && !!address;

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  // Read token decimals
  const { data: decimals } = useReadContract({
    address: DEFAULT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  // Read token symbol
  const { data: symbol } = useReadContract({
    address: DEFAULT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  const handleSettle = async () => {
    setError("");
    setTxHash(null);

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (decimals === undefined) {
      setError("Could not read token decimals. Is this a valid ERC-20 token?");
      return;
    }

    if (!chipAddress) {
      setError("No registered chip found for this wallet");
      return;
    }

    try {
      const publicClient = createBaseSepoliaPublicClient();

      setFlowState("tapping");
      await waitForNextPaint();

      const prepared = await prepareRawChipTokenTransfer({
        publicClient,
        chipAddress: chipAddress as Address,
        tokenAddress: DEFAULT_TOKEN_ADDRESS,
        recipient: RECIPIENT_ADDRESS,
        amount: DEFAULT_AMOUNT,
        decimals,
      });

      const signed = await signDigest({ digest: prepared.digest });

      setFlowState("preparing");

      const prepareRes = await fetch("/api/vincent/prepare-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerWallet: address,
          limitWallet: address,
          fundingTargetWallet: chipAddress,
          tokenAddress: DEFAULT_TOKEN_ADDRESS,
          amount: DEFAULT_AMOUNT,
          decimals,
        }),
      });

      if (!prepareRes.ok) {
        const data = await prepareRes.json().catch(() => null);
        throw new Error(data?.error || "Failed to prepare wallet for tap");
      }

      setFlowState("submitting");

      const result = await broadcastSignedChipTransaction({
        publicClient,
        chipAddress: chipAddress as Address,
        prepared,
        signed,
      });

      setFlowState("confirming");
      setTxHash(result.txHash);

      dispatchClientRefreshEvents({ balances: true, paymentRequests: true });

      setFlowState("success");
    } catch (err: any) {
      console.error("Settlement error:", err);
      setFlowState("error");
      setError(parseContractError(err) || "Settlement failed. Please try again.");
    }
  };

  // Map flowState to PaymentStatus for the indicator
  const getPaymentStatus = (): PaymentStatus => {
    if (flowState === "success") return "success";
    if (["preparing", "tapping", "submitting", "confirming"].includes(flowState)) return "processing";
    return "idle";
  };

  // Get processing text based on current flow state
  const getProcessingText = (): string => {
    switch (flowState) {
      case "tapping":
        return "Tap chip once";
      case "preparing":
        return "Preparing payment";
      case "submitting":
        return "Sending from chip";
      case "confirming":
        return "Waiting for confirmation";
      default:
        return "Processing...";
    }
  };

  // Reset to idle state for another payment
  const handleReset = () => {
    setFlowState("idle");
    setError("");
    setTxHash(null);
  };

  const paymentStatus = getPaymentStatus();
  const isProcessing = ["preparing", "tapping", "submitting", "confirming"].includes(flowState);

  const statusCopy =
    flowState === "idle"
      ? "Tap once to trigger the chip prompt. SplitHub will handle the rest on this page."
      : flowState === "tapping"
      ? "Hold the registered chip to the phone now."
      : flowState === "preparing"
      ? "SplitHub is topping up the chip if needed."
      : flowState === "submitting"
      ? "Broadcasting the chip-signed payment."
      : flowState === "confirming"
      ? "Waiting for the transaction receipt."
      : flowState === "success"
      ? `${DEFAULT_AMOUNT} ${symbol || "tokens"} sent from the chip wallet.`
      : "Payment failed. Try again.";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto">
        {!isConnected ? (
          /* Not Connected State */
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4 shadow-md">
              <Wallet className="w-8 h-8 text-base-content/50" />
            </div>
            <p className="text-base-content/50 text-center">Connect your wallet to settle</p>
          </div>
        ) : (
          <div className="flex min-h-[calc(100vh-120px)] flex-col justify-center gap-4">
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body gap-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-base-content/60">Test payment</p>
                    <h1 className="text-3xl font-semibold text-base-content leading-none">
                      {DEFAULT_AMOUNT} {symbol || "Token"}
                    </h1>
                  </div>
                  <div className="badge badge-outline badge-primary">Direct chip pay</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-base-300 bg-base-200/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-base-content/50">Recipient</p>
                    <div className="mt-1 flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <p className="font-medium text-base-content">
                        {RECIPIENT_ADDRESS.slice(0, 6)}...{RECIPIENT_ADDRESS.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-base-300 bg-base-200/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-base-content/50">Payer</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" />
                      <p className="font-medium text-base-content">{symbol || "Token"} via chip</p>
                    </div>
                  </div>
                </div>

                <PaymentStatusIndicator
                  status={paymentStatus}
                  processingText={getProcessingText()}
                  onTap={handleSettle}
                  disabled={!chipAddress}
                  size="lg"
                />

                <p className="text-center text-sm text-base-content/60">{statusCopy}</p>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 rounded-2xl border border-error/30 bg-error/10 px-4 py-3"
                >
                  <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                  <span className="text-error text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {(paymentStatus === "success" || !!txHash || (!isProcessing && flowState !== "idle")) && (
              <div className="flex flex-col items-center gap-3">
                {txHash && (
                  <a
                    href={`${baseSepolia.blockExplorers.default.url}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline font-mono"
                  >
                    View transaction
                  </a>
                )}

                {(paymentStatus === "success" || flowState === "error") && (
                  <button onClick={handleReset} className="btn btn-outline rounded-full">
                    <RefreshCw className="h-4 w-4" />
                    New payment
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

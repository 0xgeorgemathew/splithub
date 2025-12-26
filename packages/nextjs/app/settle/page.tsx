"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Coins, Fuel, RefreshCw, User, Wallet } from "lucide-react";
import { parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { PaymentStatus, PaymentStatusIndicator } from "~~/components/settle/PaymentStatusIndicator";
import { TOKENS } from "~~/config/tokens";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

// Hardcoded values
const RECIPIENT_ADDRESS = "0x09a6f8C0194246c365bB42122E872626460F8a71" as const;
const DEFAULT_TOKEN_ADDRESS = TOKENS.USDC;
const DEFAULT_AMOUNT = "1";

const ERC20_ABI = [
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "symbol",
    type: "function",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
] as const;

const SPLIT_HUB_PAYMENTS_ABI = [
  {
    name: "nonces",
    type: "function",
    inputs: [{ name: "payer", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

type FlowState = "idle" | "tapping" | "signing" | "submitting" | "confirming" | "success" | "error";

export default function SettlePage() {
  const { authenticated, user } = usePrivy();
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();

  // Use Privy's authentication state instead of wagmi's useAccount
  // This properly reflects the embedded wallet connection status
  const address = user?.wallet?.address as `0x${string}` | undefined;
  const isConnected = authenticated && !!address;

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get SplitHubPayments contract address for the current network
  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;
  const paymentsAddress = chainContracts?.SplitHubPayments?.address as `0x${string}` | undefined;

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

  // Read current nonce for payer
  const { data: currentNonce, refetch: refetchNonce } = useReadContract({
    address: paymentsAddress,
    abi: SPLIT_HUB_PAYMENTS_ABI,
    functionName: "nonces",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!paymentsAddress,
    },
  });

  const handleSettle = async () => {
    setError("");
    setTxHash(null);

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!paymentsAddress) {
      setError("SplitHubPayments contract not deployed on this network");
      return;
    }

    if (decimals === undefined) {
      setError("Could not read token decimals. Is this a valid ERC-20 token?");
      return;
    }

    if (currentNonce === undefined) {
      setError("Could not read nonce from contract");
      return;
    }

    try {
      setFlowState("tapping");

      // Build PaymentAuth struct
      const amountInWei = parseUnits(DEFAULT_AMOUNT, decimals);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

      const paymentAuth = {
        payer: address,
        recipient: RECIPIENT_ADDRESS,
        token: DEFAULT_TOKEN_ADDRESS,
        amount: amountInWei,
        nonce: currentNonce,
        deadline: deadline,
      };

      // EIP-712 domain and types matching SplitHubPayments.sol
      const domain = {
        name: "SplitHubPayments",
        version: "1",
        chainId: BigInt(targetNetwork.id),
        verifyingContract: paymentsAddress,
      };

      const types = {
        PaymentAuth: [
          { name: "payer", type: "address" },
          { name: "recipient", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      // Signing state
      setFlowState("signing");

      // Sign with NFC chip
      const chipResult = await signTypedData({
        domain,
        types,
        primaryType: "PaymentAuth",
        message: paymentAuth,
      });

      // Submitting state
      setFlowState("submitting");

      // Submit to relay API
      const response = await fetch("/api/relay/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth: {
            payer: paymentAuth.payer,
            recipient: paymentAuth.recipient,
            token: paymentAuth.token,
            amount: paymentAuth.amount.toString(),
            nonce: paymentAuth.nonce.toString(),
            deadline: paymentAuth.deadline.toString(),
          },
          signature: chipResult.signature,
          contractAddress: paymentsAddress,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Relay request failed");
      }

      // Confirming state
      setFlowState("confirming");
      setTxHash(result.txHash);

      // Brief delay to show confirming state
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refetch nonce for next payment
      await refetchNonce();

      // Trigger balance refresh across the app
      window.dispatchEvent(new Event("refreshBalances"));

      setFlowState("success");
    } catch (err: any) {
      console.error("Settlement error:", err);
      setFlowState("error");
      setError(err.message || "Settlement failed. Please try again.");
    }
  };

  // Map flowState to PaymentStatus for the indicator
  const getPaymentStatus = (): PaymentStatus => {
    if (flowState === "success") return "success";
    if (["tapping", "signing", "submitting", "confirming"].includes(flowState)) return "processing";
    return "idle";
  };

  // Get processing text based on current flow state
  const getProcessingText = (): string => {
    switch (flowState) {
      case "tapping":
        return "Tap your chip...";
      case "signing":
        return "Authorizing...";
      case "submitting":
        return "Broadcasting...";
      case "confirming":
        return "Confirming...";
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

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4 pb-24">
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
          <div className="flex flex-col items-center pt-6">
            {/* Info Pills - Only show in idle state */}
            <AnimatePresence>
              {paymentStatus === "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
                  className="flex flex-wrap justify-center gap-2 mb-6"
                >
                  {/* Recipient Pill */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-base-content">
                      {RECIPIENT_ADDRESS.slice(0, 6)}...{RECIPIENT_ADDRESS.slice(-4)}
                    </span>
                  </div>

                  {/* Token Pill */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-primary/50 rounded-full">
                    <Coins className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-base-content">{symbol || "Token"}</span>
                    <span className="w-1.5 h-1.5 bg-success rounded-full" />
                  </div>

                  {/* Gasless Pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full">
                    <Fuel className="w-3.5 h-3.5 text-success" />
                    <span className="text-xs font-medium text-success">Gasless</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Amount Display - Morphs into success message */}
            <AnimatePresence mode="wait">
              {paymentStatus !== "success" ? (
                <motion.div
                  key="amount"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-center mb-8"
                >
                  <p className="text-6xl font-bold text-base-content mb-1">{DEFAULT_AMOUNT}</p>
                  <p className="text-base-content/50 text-sm">{symbol || "tokens"}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="success-info"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-6"
                >
                  <h3 className="text-2xl font-bold mb-3 text-base-content">Payment Complete</h3>
                  <div className="flex items-center justify-center gap-2 px-4 py-2 bg-base-100 border border-success/30 rounded-full">
                    <Coins className="w-4 h-4 text-success" />
                    <span className="text-sm font-semibold text-base-content">
                      {DEFAULT_AMOUNT} {symbol || "tokens"} sent
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-error/10 border border-error/30 rounded-full mb-6 max-w-xs"
                >
                  <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                  <span className="text-error text-xs">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Morphing Payment Status Indicator */}
            <PaymentStatusIndicator
              status={paymentStatus}
              processingText={getProcessingText()}
              onTap={handleSettle}
              disabled={!paymentsAddress}
              size="lg"
            />

            {/* Transaction Link & New Payment Button - Only on success */}
            <AnimatePresence>
              {paymentStatus === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center gap-3 mt-6"
                >
                  {txHash && (
                    <a
                      href={`${targetNetwork.blockExplorers?.default.url}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-mono"
                    >
                      View transaction →
                    </a>
                  )}

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    onClick={handleReset}
                    className="flex items-center gap-2 px-5 py-2.5 bg-base-300/50 hover:bg-base-300 rounded-full text-sm font-medium text-base-content transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    New Payment
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

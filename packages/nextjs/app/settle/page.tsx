"use client";

import { useState } from "react";
import { AlertCircle, Check, Coins, Fuel, Loader2, Nfc, User, Wallet } from "lucide-react";
import { parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

// Hardcoded values
const RECIPIENT_ADDRESS = "0x09a6f8C0194246c365bB42122E872626460F8a71" as const;
const DEFAULT_TOKEN_ADDRESS = "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a" as const;
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

// Progress steps for visual indicator
const FLOW_STEPS = [
  { key: "tapping", label: "Tap" },
  { key: "signing", label: "Sign" },
  { key: "submitting", label: "Send" },
  { key: "confirming", label: "Confirm" },
] as const;

export default function SettlePage() {
  const { address, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
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
      setStatusMessage("Tap your chip");

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
      setStatusMessage("Signing...");

      // Sign with NFC chip
      const chipResult = await signTypedData({
        domain,
        types,
        primaryType: "PaymentAuth",
        message: paymentAuth,
      });

      // Submitting state
      setFlowState("submitting");
      setStatusMessage("Sending...");

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
      setStatusMessage("Confirming...");
      setTxHash(result.txHash);

      // Brief delay to show confirming state
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refetch nonce for next payment
      await refetchNonce();

      setFlowState("success");
      setStatusMessage("Complete!");
    } catch (err: any) {
      console.error("Settlement error:", err);
      setFlowState("error");
      setError(err.message || "Settlement failed. Please try again.");
      setStatusMessage("");
    }
  };

  const handleReset = () => {
    setFlowState("idle");
    setError("");
    setStatusMessage("");
    setTxHash(null);
  };

  // Helper to get current step index
  const getCurrentStepIndex = () => {
    const stepMap: Record<string, number> = {
      tapping: 0,
      signing: 1,
      submitting: 2,
      confirming: 3,
    };
    return stepMap[flowState] ?? -1;
  };

  const isProcessing = ["tapping", "signing", "submitting", "confirming"].includes(flowState);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4 pb-24">
      <div className="w-full max-w-md mx-auto">
        {!isConnected ? (
          /* Not Connected State */
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4 shadow-md">
              <Wallet className="w-8 h-8 text-base-content/50" />
            </div>
            <p className="text-base-content/50 text-center">Connect your wallet to settle</p>
          </div>
        ) : flowState === "success" ? (
          /* Success State */
          <div className="flex flex-col items-center justify-center mt-12 fade-in-up">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success/20 mb-6 success-glow">
              <Check className="w-12 h-12 text-success" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-base-content">Payment Complete</h3>

            {/* Amount sent */}
            <div className="flex items-center gap-2 px-4 py-2 bg-base-100 border border-success/30 rounded-full mb-4">
              <Coins className="w-4 h-4 text-success" />
              <span className="text-sm font-semibold text-base-content">
                {DEFAULT_AMOUNT} {symbol || "tokens"} sent
              </span>
            </div>

            {/* Transaction hash */}
            {txHash && (
              <a
                href={`${targetNetwork.blockExplorers?.default.url}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline font-mono mb-6"
              >
                View transaction →
              </a>
            )}

            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-content font-medium rounded-full transition-all duration-200 shadow-md"
            >
              Pay Again
            </button>
          </div>
        ) : isProcessing ? (
          /* Processing States */
          <div className="flex flex-col items-center justify-center mt-12">
            {/* Progress Steps */}
            <div className="flex items-center gap-2 mb-8">
              {FLOW_STEPS.map((step, idx) => {
                const currentIdx = getCurrentStepIndex();
                const isComplete = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={step.key} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                        isComplete
                          ? "bg-success text-success-content"
                          : isCurrent
                            ? "bg-primary text-primary-content"
                            : "bg-base-300 text-base-content/50"
                      }`}
                    >
                      {isComplete ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    {idx < FLOW_STEPS.length - 1 && (
                      <div className={`w-6 h-0.5 ${isComplete ? "bg-success" : "bg-base-300"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Animated Processing Indicator */}
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              {flowState === "tapping" && (
                <>
                  <div className="nfc-pulse-ring" />
                  <div className="nfc-pulse-ring" style={{ animationDelay: "0.5s" }} />
                </>
              )}
            </div>

            <h3 className="text-lg font-semibold mb-1 text-base-content">{statusMessage}</h3>
            <p className="text-base-content/50 text-sm">
              {flowState === "tapping" && "Hold device near chip"}
              {flowState === "signing" && "Authorizing payment"}
              {flowState === "submitting" && "Broadcasting to network"}
              {flowState === "confirming" && "Waiting for confirmation"}
            </p>
          </div>
        ) : (
          /* Main Payment UI - Idle State */
          <div className="flex flex-col items-center pt-6">
            {/* Info Pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
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
            </div>

            {/* Amount Display */}
            <div className="text-center mb-8">
              <p className="text-6xl font-bold text-base-content mb-1">{DEFAULT_AMOUNT}</p>
              <p className="text-base-content/50 text-sm">{symbol || "tokens"}</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-error/10 border border-error/30 rounded-full mb-6 max-w-xs">
                <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                <span className="text-error text-xs">{error}</span>
              </div>
            )}

            {/* 3D NFC Chip Button */}
            <div className="relative">
              {/* Pulse rings */}
              <div className="nfc-pulse-ring" />
              <div className="nfc-pulse-ring" />
              <div className="nfc-pulse-ring" />

              <button
                onClick={handleSettle}
                disabled={!paymentsAddress}
                className="nfc-chip-btn flex flex-col items-center justify-center text-primary-content disabled:opacity-50"
              >
                <Nfc className="w-12 h-12 mb-1" />
                <span className="text-sm font-bold">Tap to Pay</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

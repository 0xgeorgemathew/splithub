"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Coins, Loader2, Nfc, Send, Wallet } from "lucide-react";
import { isAddress, parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

// Hardcoded recipient address
const RECIPIENT_ADDRESS = "0x09a6f8C0194246c365bB42122E872626460F8a71" as const;

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

type FlowState = "idle" | "tapping" | "submitting" | "success" | "error";

export default function SettlePage() {
  const { address, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { signTypedData } = useHaloChip();

  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
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
    address: isAddress(tokenAddress) ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: isAddress(tokenAddress),
    },
  });

  // Read token symbol
  const { data: symbol } = useReadContract({
    address: isAddress(tokenAddress) ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled: isAddress(tokenAddress),
    },
  });

  // Read current nonce for payer
  const { data: currentNonce } = useReadContract({
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

    if (!isAddress(tokenAddress)) {
      setError("Please enter a valid token address");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
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
      setStatusMessage("Hold your device near the NFC chip for 2-3 seconds...");

      // Build PaymentAuth struct
      const amountInWei = parseUnits(amount, decimals);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

      const paymentAuth = {
        payer: address,
        recipient: RECIPIENT_ADDRESS,
        token: tokenAddress as `0x${string}`,
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

      setStatusMessage("Tap NFC chip to sign payment...");

      // Sign with NFC chip
      const chipResult = await signTypedData({
        domain,
        types,
        primaryType: "PaymentAuth",
        message: paymentAuth,
      });

      setStatusMessage("Submitting payment to relay...");
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

      setTxHash(result.txHash);
      setFlowState("success");
      setStatusMessage("Payment successful!");
    } catch (err: any) {
      console.error("Settlement error:", err);
      setFlowState("error");
      setError(err.message || "Settlement failed. Please try again.");
      setStatusMessage("");
    }
  };

  const handleReset = () => {
    setFlowState("idle");
    setTokenAddress("");
    setAmount("");
    setError("");
    setStatusMessage("");
    setTxHash(null);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 mb-3 shadow-md">
            <Send className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 text-slate-900 tracking-tight">Settlement</h1>
          <p className="text-slate-600 text-base font-light">Send tokens via NFC chip (gasless)</p>
        </div>

        {/* Main Card */}
        <div className="card bg-white shadow-lg border border-slate-200">
          <div className="card-body p-6">
            {!isConnected ? (
              /* Not Connected State */
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <Wallet className="w-8 h-8 text-slate-700" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Connect Your Wallet</h3>
                <p className="text-slate-600">Please connect your wallet using the button in the header to continue</p>
              </div>
            ) : flowState === "success" ? (
              /* Success State */
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Payment Successful!</h3>
                <p className="text-slate-600 mb-2">
                  {amount} {symbol || "tokens"} sent to recipient
                </p>
                {txHash && (
                  <p className="text-sm text-slate-500 font-mono break-all mb-4">
                    Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </p>
                )}
                <button
                  onClick={handleReset}
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-all duration-200"
                >
                  Make Another Payment
                </button>
              </div>
            ) : flowState === "tapping" || flowState === "submitting" ? (
              /* Processing State */
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900">
                  {flowState === "tapping" ? "Tap Your NFC Chip" : "Processing Payment"}
                </h3>
                <p className="text-slate-600">{statusMessage}</p>
              </div>
            ) : (
              /* Form */
              <div className="space-y-6">
                {/* Recipient Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-600 mb-1">Recipient</p>
                  <p className="font-mono text-sm text-slate-900 break-all">{RECIPIENT_ADDRESS}</p>
                </div>

                {/* Token Address Input */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-slate-600" />
                      Token Address
                    </span>
                  </label>
                  <input
                    type="text"
                    value={tokenAddress}
                    onChange={e => setTokenAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition font-mono text-sm"
                  />
                  {symbol && decimals !== undefined && (
                    <p className="text-sm text-slate-600 mt-1">
                      Token: {symbol} ({decimals} decimals)
                    </p>
                  )}
                </div>

                {/* Amount Input */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700">Amount</span>
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="100.0"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                  />
                </div>

                {/* Current Nonce Info */}
                {currentNonce !== undefined && (
                  <div className="text-sm text-slate-500">Current nonce: {currentNonce.toString()}</div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span className="text-red-800 text-sm">{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSettle}
                  disabled={!paymentsAddress || !isAddress(tokenAddress) || !amount}
                  className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Nfc className="w-5 h-5" />
                  Tap Chip to Pay
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        {isConnected && flowState === "idle" && (
          <div className="mt-4 text-center text-sm text-slate-600">
            <p>Make sure you have approved the token first</p>
            <p className="mt-1">Payment is gasless - relayer pays the gas</p>
          </div>
        )}
      </div>
    </div>
  );
}

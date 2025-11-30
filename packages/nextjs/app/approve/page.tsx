"use client";

import { useState } from "react";
import { AlertCircle, Check, Coins, Loader2, Shield, Wallet } from "lucide-react";
import { parseUnits } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

// Default values
const DEFAULT_TOKEN_ADDRESS = "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a" as const;
const DEFAULT_AMOUNT = "1000";

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
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

export default function ApprovePage() {
  const { address, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  const [error, setError] = useState("");

  // Get SplitHubPayments contract address for the current network
  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;
  const spenderAddress = chainContracts?.SplitHubPayments?.address as `0x${string}` | undefined;

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

  // Write contract hook
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleApprove = async () => {
    setError("");

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!spenderAddress) {
      setError("SplitHubPayments contract not deployed on this network");
      return;
    }

    if (decimals === undefined) {
      setError("Could not read token decimals");
      return;
    }

    try {
      const approvalAmount = parseUnits(DEFAULT_AMOUNT, decimals);

      writeContract({
        address: DEFAULT_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spenderAddress, approvalAmount],
      });
    } catch (err: any) {
      console.error("Approval error:", err);
      setError(err.message || "Approval failed");
    }
  };

  const handleReset = () => {
    reset();
    setError("");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4 pb-24">
      <div className="w-full max-w-md mx-auto">
        {!isConnected ? (
          /* Not Connected State */
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4 shadow-md">
              <Wallet className="w-8 h-8 text-base-content/50" />
            </div>
            <p className="text-base-content/50 text-center">Connect your wallet to approve</p>
          </div>
        ) : isSuccess ? (
          /* Success State */
          <div className="flex flex-col items-center justify-center mt-12 fade-in-up">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success/20 mb-6 success-glow">
              <Check className="w-12 h-12 text-success" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-base-content">Approved!</h3>

            {/* Approval info */}
            <div className="flex items-center gap-2 px-4 py-2 bg-base-100 border border-success/30 rounded-full mb-4">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-sm font-semibold text-base-content">
                {DEFAULT_AMOUNT} {symbol || "tokens"}
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
              Done
            </button>
          </div>
        ) : isPending || isConfirming ? (
          /* Processing State */
          <div className="flex flex-col items-center justify-center mt-12">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-8">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isPending ? "bg-primary text-primary-content" : "bg-success text-success-content"
                }`}
              >
                {isPending ? "1" : <Check className="w-4 h-4" />}
              </div>
              <div className={`w-6 h-0.5 ${isConfirming ? "bg-success" : "bg-base-300"}`} />
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isConfirming ? "bg-primary text-primary-content" : "bg-base-300 text-base-content/50"
                }`}
              >
                2
              </div>
            </div>

            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-1 text-base-content">
              {isPending ? "Confirm in Wallet" : "Confirming..."}
            </h3>
            <p className="text-base-content/50 text-sm">
              {isPending ? "Check your wallet to approve" : "Waiting for confirmation"}
            </p>
          </div>
        ) : (
          /* Main Approval UI */
          <div className="flex flex-col items-center pt-6">
            {/* Info Pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {/* Token Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-primary/50 rounded-full">
                <Coins className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-base-content">{symbol || "Token"}</span>
                <span className="w-1.5 h-1.5 bg-success rounded-full" />
              </div>

              {/* Spender Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-base-content">
                  {spenderAddress ? `${spenderAddress.slice(0, 6)}...${spenderAddress.slice(-4)}` : "Not deployed"}
                </span>
              </div>
            </div>

            {/* Amount Display */}
            <div className="text-center mb-8">
              <p className="text-6xl font-bold text-base-content mb-1">{DEFAULT_AMOUNT}</p>
              <p className="text-base-content/50 text-sm">{symbol || "tokens"} to approve</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-error/10 border border-error/30 rounded-full mb-6 max-w-xs">
                <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                <span className="text-error text-xs">{error}</span>
              </div>
            )}

            {/* Approve Button - kept similar to original design */}
            <button
              onClick={handleApprove}
              disabled={!spenderAddress}
              className="w-full max-w-xs py-3.5 px-6 bg-primary hover:bg-primary/90 text-primary-content font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shield className="w-5 h-5" />
              Approve Token
            </button>

            {/* Info text */}
            <p className="mt-4 text-xs text-base-content/40 text-center">Required before making payments</p>
          </div>
        )}
      </div>
    </div>
  );
}

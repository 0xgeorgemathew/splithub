"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Coins, Loader2, Shield, Wallet } from "lucide-react";
import { isAddress, maxUint256, parseUnits } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

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

  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [approveUnlimited, setApproveUnlimited] = useState(false);
  const [error, setError] = useState("");

  // Get SplitHubPayments contract address for the current network
  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;
  const spenderAddress = chainContracts?.SplitHubPayments?.address as `0x${string}` | undefined;

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

    if (!isAddress(tokenAddress)) {
      setError("Please enter a valid token address");
      return;
    }

    if (!spenderAddress) {
      setError("SplitHubPayments contract not deployed on this network");
      return;
    }

    if (!approveUnlimited && !amount) {
      setError("Please enter an amount or select unlimited approval");
      return;
    }

    if (decimals === undefined) {
      setError("Could not read token decimals. Is this a valid ERC-20 token?");
      return;
    }

    try {
      const approvalAmount = approveUnlimited ? maxUint256 : parseUnits(amount, decimals);

      writeContract({
        address: tokenAddress as `0x${string}`,
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
    setTokenAddress("");
    setAmount("");
    setApproveUnlimited(false);
    setError("");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 mb-3 shadow-md">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 text-slate-900 tracking-tight">Token Approval</h1>
          <p className="text-slate-600 text-base font-light">Approve SplitHubPayments to spend your tokens</p>
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
            ) : isSuccess ? (
              /* Success State */
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Approval Successful!</h3>
                <p className="text-slate-600 mb-4">{symbol || "Token"} has been approved for SplitHubPayments</p>
                {txHash && (
                  <p className="text-sm text-slate-500 font-mono break-all mb-4">
                    Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </p>
                )}
                <button
                  onClick={handleReset}
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-all duration-200"
                >
                  Approve Another Token
                </button>
              </div>
            ) : (
              /* Form */
              <div className="space-y-6">
                {/* Spender Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-600 mb-1">Spender (SplitHubPayments)</p>
                  <p className="font-mono text-sm text-slate-900 break-all">
                    {spenderAddress || "Not deployed on this network"}
                  </p>
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
                    <span className="label-text font-semibold text-slate-700">Amount to Approve</span>
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="100.0"
                    disabled={approveUnlimited}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Unlimited Checkbox */}
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      checked={approveUnlimited}
                      onChange={e => setApproveUnlimited(e.target.checked)}
                      className="checkbox checkbox-sm"
                    />
                    <span className="label-text text-slate-700">Approve unlimited amount</span>
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span className="text-red-800 text-sm">{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleApprove}
                  disabled={isPending || isConfirming || !spenderAddress}
                  className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending || isConfirming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isPending ? "Confirm in Wallet..." : "Confirming..."}
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Approve Token
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        {isConnected && !isSuccess && (
          <div className="mt-4 text-center text-sm text-slate-600">
            <p>This allows SplitHubPayments to transfer tokens on your behalf</p>
            <p className="mt-1">Required before making gasless payments</p>
          </div>
        )}
      </div>
    </div>
  );
}

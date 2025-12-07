"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { AlertCircle, Check, Coins, Loader2, Shield } from "lucide-react";
import { createWalletClient, custom, parseUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { TOKENS } from "~~/config/tokens";
import deployedContracts from "~~/contracts/deployedContracts";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { supabase } from "~~/lib/supabase";

// Token address from centralized config
const DEFAULT_TOKEN_ADDRESS = TOKENS.USDC;
const DEFAULT_AMOUNT = "1000";

// Approval states
type ApprovalState = "pending" | "approving" | "approved";

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

export function ApprovalFlow() {
  const router = useRouter();
  const { targetNetwork } = useTargetNetwork();
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  // Use Privy's authentication state instead of wagmi's useAccount
  // This properly reflects the embedded wallet connection status
  const address = user?.wallet?.address as `0x${string}` | undefined;
  const isConnected = authenticated && !!address;

  const [error, setError] = useState("");
  const [paymentsState, setPaymentsState] = useState<ApprovalState>("pending");
  const [creditsState, setCreditsState] = useState<ApprovalState>("pending");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);

  // Get contract addresses for the current network
  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;

  const paymentsAddress = chainContracts?.["SplitHubPayments"]?.address as `0x${string}` | undefined;
  const creditsAddress = chainContracts?.["CreditToken"]?.address as `0x${string}` | undefined;

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

  // Wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess,
    isError: txError,
    error: txErrorDetails,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Helper function to get wallet client from Privy wallet
  const getWalletClient = async () => {
    // Find the embedded wallet
    const embeddedWallet = wallets.find(w => w.walletClientType === "privy");
    if (!embeddedWallet) {
      throw new Error("No embedded wallet found");
    }

    // Switch chain if needed
    await embeddedWallet.switchChain(baseSepolia.id);

    // Get the provider
    const provider = await embeddedWallet.getEthereumProvider();

    // Create viem wallet client
    return createWalletClient({
      chain: baseSepolia,
      transport: custom(provider),
      account: embeddedWallet.address as `0x${string}`,
    });
  };

  // Helper to reset state - wrapped in useCallback to avoid useEffect dependency issues
  const reset = useCallback(() => {
    setTxHash(undefined);
    setIsPending(false);
  }, []);

  // Handle successful approvals - auto-advance without toasts
  useEffect(() => {
    if (isSuccess && paymentsState === "approving") {
      // Immediately update state to show success
      setPaymentsState("approved");
      reset();
      setError("");
    } else if (isSuccess && creditsState === "approving") {
      // Immediately update state to show success
      setCreditsState("approved");
      reset();

      // Mark approvals as completed in database
      const updateApprovalStatus = async () => {
        if (!user?.id) return;

        try {
          await supabase.from("users").update({ approval_status: "completed" }).eq("privy_user_id", user.id);
        } catch (err) {
          console.error("Failed to update approval status:", err);
        }
      };

      updateApprovalStatus();

      // Redirect to /splits after brief success display
      setTimeout(() => {
        router.replace("/splits");
      }, 600);
    }
  }, [isSuccess, paymentsState, creditsState, reset, router, user]);

  // Handle failed approvals - reset state and show error
  useEffect(() => {
    if (txError && paymentsState === "approving") {
      console.error("Payments approval failed:", txErrorDetails);
      setPaymentsState("pending");
      setError(txErrorDetails?.message || "Transaction failed. Please try again.");
      reset();
    } else if (txError && creditsState === "approving") {
      console.error("Credits approval failed:", txErrorDetails);
      setCreditsState("pending");
      setError(txErrorDetails?.message || "Transaction failed. Please try again.");
      reset();
    }
  }, [txError, txErrorDetails, paymentsState, creditsState, reset]);

  const handleApprovePayments = async () => {
    setError("");

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!paymentsAddress) {
      setError("SplitHubPayments contract not deployed on this network");
      return;
    }

    if (decimals === undefined) {
      setError("Could not read token decimals");
      return;
    }

    try {
      setPaymentsState("approving");
      setIsPending(true);
      const approvalAmount = parseUnits(DEFAULT_AMOUNT, decimals);

      // Use Privy wallet directly instead of wagmi's useWriteContract
      const walletClient = await getWalletClient();
      const hash = await walletClient.writeContract({
        address: DEFAULT_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [paymentsAddress, approvalAmount],
      });

      setTxHash(hash);
      setIsPending(false);
    } catch (err: unknown) {
      console.error("Approval error:", err);
      const errorMessage =
        err instanceof Error && err.message.includes("User rejected")
          ? "Transaction rejected. Please try again when ready."
          : err instanceof Error
            ? err.message
            : "Approval failed";
      setError(errorMessage);
      setPaymentsState("pending");
      setIsPending(false);
    }
  };

  const handleApproveCredits = async () => {
    setError("");

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!creditsAddress) {
      setError("CreditToken contract not deployed on this network");
      return;
    }

    if (decimals === undefined) {
      setError("Could not read token decimals");
      return;
    }

    try {
      setCreditsState("approving");
      setIsPending(true);
      const approvalAmount = parseUnits(DEFAULT_AMOUNT, decimals);

      // Use Privy wallet directly instead of wagmi's useWriteContract
      const walletClient = await getWalletClient();
      const hash = await walletClient.writeContract({
        address: DEFAULT_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [creditsAddress, approvalAmount],
      });

      setTxHash(hash);
      setIsPending(false);
    } catch (err: unknown) {
      console.error("Approval error:", err);
      const errorMessage =
        err instanceof Error && err.message.includes("User rejected")
          ? "Transaction rejected. Please try again when ready."
          : err instanceof Error
            ? err.message
            : "Approval failed";
      setError(errorMessage);
      setCreditsState("pending");
      setIsPending(false);
    }
  };

  // Calculate progress
  const currentStep = paymentsState === "pending" ? 2 : 3;
  const progressPercent = paymentsState === "pending" ? 66.66 : 100;

  // Show processing overlay during transaction
  const showProcessingOverlay = isPending || isConfirming;

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center mt-20 space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-base-100 shadow-lg">
          <Shield className="w-10 h-10 text-base-content/50" />
        </div>
        <p className="text-base-content/60 text-center font-medium">Connect your wallet to approve</p>
      </div>
    );
  }

  return (
    <>
      {/* Fullscreen Processing Overlay */}
      {showProcessingOverlay && (
        <div className="fixed inset-0 bg-base-300/95 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="text-center space-y-6 px-4">
            {/* Animated spinner */}
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute w-32 h-32 rounded-full border-4 border-primary/20" />
              <div className="absolute w-32 h-32 rounded-full border-4 border-t-primary border-r-primary/50 border-b-transparent border-l-transparent animate-spin" />
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                {isPending ? (
                  <Shield className="w-12 h-12 text-primary animate-pulse" />
                ) : (
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                )}
              </div>
            </div>

            {/* Status text */}
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-base-content">
                {isPending ? "Confirm in Wallet" : "Processing Approval"}
              </h3>
              <p className="text-base-content/60 text-sm max-w-xs mx-auto">
                {isPending
                  ? "Check your wallet to approve the transaction"
                  : "Your approval is being confirmed on-chain"}
              </p>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPending ? "bg-primary animate-pulse" : "bg-primary/40"}`} />
              <div className={`w-2 h-2 rounded-full ${isConfirming ? "bg-primary animate-pulse" : "bg-primary/40"}`} />
              <div className="w-2 h-2 rounded-full bg-primary/40" />
            </div>
          </div>
        </div>
      )}

      {/* Progress Indicator - Step 2 or 3 of 3 */}
      <div className="mb-8 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-base-content">Step {currentStep} of 3</span>
          <span className="text-sm text-base-content/60">
            {paymentsState === "pending" ? "Approve for Payments" : "Approve for Credits"}
          </span>
        </div>
        <div className="relative w-full h-2.5 bg-base-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-primary/40 rounded-full animate-pulse"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Approval UI */}
      <div className="space-y-6">
        {/* Payments Approval Card */}
        <div
          className={`card border-2 transition-all duration-500 ${
            paymentsState === "approved"
              ? "bg-success/10 border-success/50 animate-in fade-in slide-in-from-bottom-2"
              : paymentsState === "approving"
                ? "bg-primary/10 border-primary/50"
                : "bg-base-100 border-base-300 hover:border-primary/50"
          }`}
        >
          <div className="card-body p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    paymentsState === "approved"
                      ? "bg-success/20"
                      : paymentsState === "approving"
                        ? "bg-primary/20"
                        : "bg-base-200"
                  }`}
                >
                  {paymentsState === "approved" ? (
                    <Check className="w-6 h-6 text-success" strokeWidth={3} />
                  ) : (
                    <Shield className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-base-content">Payments</h3>
                  <p className="text-xs text-base-content/60">Required for split payments</p>
                </div>
              </div>
              {paymentsState === "approved" && (
                <span className="badge badge-success gap-2">
                  <Check className="w-3 h-3" />
                  Approved
                </span>
              )}
            </div>

            {paymentsState === "pending" && (
              <button
                onClick={handleApprovePayments}
                className="w-full py-3 px-6 bg-primary hover:bg-primary/90 text-primary-content font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Shield className="w-5 h-5" />
                Approve {DEFAULT_AMOUNT} {symbol || "USDT"}
              </button>
            )}
          </div>
        </div>

        {/* Credits Approval Card */}
        <div
          className={`card border-2 transition-all duration-500 ${
            creditsState === "approved"
              ? "bg-success/10 border-success/50 animate-in fade-in slide-in-from-bottom-2"
              : creditsState === "approving"
                ? "bg-primary/10 border-primary/50"
                : paymentsState !== "approved"
                  ? "bg-base-200 border-base-300 opacity-50"
                  : "bg-base-100 border-base-300 hover:border-primary/50"
          }`}
        >
          <div className="card-body p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    creditsState === "approved"
                      ? "bg-success/20"
                      : creditsState === "approving"
                        ? "bg-primary/20"
                        : "bg-base-200"
                  }`}
                >
                  {creditsState === "approved" ? (
                    <Check className="w-6 h-6 text-success" strokeWidth={3} />
                  ) : (
                    <Coins className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-base-content">Credits</h3>
                  <p className="text-xs text-base-content/60">Required for activity purchases</p>
                </div>
              </div>
              {creditsState === "approved" && (
                <span className="badge badge-success gap-2">
                  <Check className="w-3 h-3" />
                  Approved
                </span>
              )}
            </div>

            {paymentsState === "approved" && creditsState === "pending" && (
              <button
                onClick={handleApproveCredits}
                className="w-full py-3 px-6 bg-primary hover:bg-primary/90 text-primary-content font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Coins className="w-5 h-5" />
                Approve {DEFAULT_AMOUNT} {symbol || "USDT"}
              </button>
            )}

            {paymentsState !== "approved" && (
              <p className="text-sm text-base-content/40 text-center">Complete Payments approval first</p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-error/10 border border-error/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
            <span className="text-error text-sm">{error}</span>
          </div>
        )}

        {/* Info */}
        <div className="text-center text-xs text-base-content/40 pt-4">Both approvals are required to use SplitHub</div>
      </div>
    </>
  );
}

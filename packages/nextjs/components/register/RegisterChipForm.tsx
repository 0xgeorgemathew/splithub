"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Nfc } from "lucide-react";
import { OnboardingFinalizer } from "~~/components/onboarding/OnboardingFinalizer";
import { BASE_SEPOLIA_CHAIN_ID, NFC_TAP_COOLDOWN_MS, ONBOARDING_MIN_DISPLAY_MS } from "~~/constants/app.constants";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { supabase } from "~~/lib/supabase";
import { formatAPIError, formatNFCError } from "~~/utils/errorFormatting";

/**
 * Chip Registration Flow States
 *
 * STATE MACHINE:
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   idle ──▶ tapping ──▶ registering ──▶ finalizing ──▶ [navigate]
 *     │         │            │               │
 *     │         └────────────┴───────────────┴──▶ error
 *     │                                              │
 *     └──────────────────────────────────────────────┘ (retry)
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * State Descriptions:
 * - idle: Initial state, waiting for user to tap
 * - tapping: NFC chip is being read (first tap to get address, second to sign)
 * - registering: On-chain registration in progress via relayer
 * - finalizing: Backend finalize API running, full-screen loader shown
 * - error: Something failed, user can retry
 *
 * SIDE EFFECTS:
 * - Sets sessionStorage.skipLoadingStates before navigation (see finalizeOnboarding)
 * - Navigates to route returned by /api/onboarding/finalize
 */
type FlowState = "idle" | "tapping" | "registering" | "finalizing" | "error";

interface RegisterChipFormProps {
  userId: string;
  embeddedWallet: string;
  twitterHandle?: string | null;
  twitterName?: string | null;
}

export function RegisterChipForm({
  userId,
  embeddedWallet,
  twitterHandle: _twitterHandle,
  twitterName: _twitterName,
}: RegisterChipFormProps) {
  const router = useRouter();
  const { signMessage, signTypedData } = useHaloChip();
  const { data: registryContract } = useDeployedContractInfo("SplitHubRegistry");

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [chipAddress, setChipAddress] = useState<string | null>(null);

  // Prevent duplicate finalize calls
  const isFinalizingRef = useRef(false);

  /**
   * Finalizes the onboarding process by calling the backend API.
   *
   * This is the SINGLE SOURCE OF TRUTH for determining what happens next:
   * - Backend checks all conditions (chip status, approvals, etc.)
   * - Backend returns the appropriate next route
   * - This function handles navigation
   *
   * SIDE EFFECTS:
   * ─────────────────────────────────────────────────────────────────────────
   * 1. API Call: POST /api/onboarding/finalize with action and chip address
   * 2. SessionStorage: Sets "skipLoadingStates" flag (read by destination page
   *    to skip redundant loading animations since we just showed a loader)
   * 3. Navigation: router.replace() to the route returned by backend
   *
   * RACE CONDITION PREVENTION:
   * Uses isFinalizingRef to prevent duplicate calls (e.g., from double-taps
   * or React strict mode double-renders)
   *
   * @param action - "skip" to skip chip registration, "register" to complete it
   * @param detectedChipAddress - The chip's ethereum address (required for "register")
   */
  const finalizeOnboarding = async (action: "skip" | "register", detectedChipAddress?: string) => {
    // Prevent duplicate calls
    if (isFinalizingRef.current) {
      console.warn("Finalize already in progress, ignoring duplicate call");
      return;
    }

    isFinalizingRef.current = true;
    setFlowState("finalizing");
    setError("");

    try {
      // Start minimum display time and API call in parallel
      const startTime = Date.now();

      const response = await fetch("/api/onboarding/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action,
          chipAddress: detectedChipAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to finalize onboarding");
      }

      // Calculate remaining time to meet minimum display duration
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, ONBOARDING_MIN_DISPLAY_MS - elapsed);

      // Wait for remaining time if needed
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      /**
       * SIDE EFFECT: Skip loading states on destination page.
       *
       * Set flag BEFORE navigation to ensure it's available when the
       * destination page mounts. Navigation is async, so setting after
       * router.replace() creates a race condition.
       *
       * The destination page checks for this flag and skips its initial
       * loading animation if set. This provides a smoother UX since
       * we just showed a full-screen loader during finalization.
       *
       * The destination page should clear this flag after reading it.
       */
      sessionStorage.setItem("skipLoadingStates", "true");

      // Navigate to the route returned by backend
      router.replace(data.nextRoute);

      // Reset ref on success to allow retry if user navigates back
      isFinalizingRef.current = false;
    } catch (err: unknown) {
      console.error("Finalize onboarding error:", err);
      setFlowState("error");
      setError(formatAPIError(err));
      isFinalizingRef.current = false;
    }
  };

  const handleChipRegistration = async () => {
    if (!registryContract?.address) {
      setError("Registry contract not found");
      return;
    }

    setError("");
    setFlowState("tapping");
    setStatusMessage("Hold your device near the NFC chip...");

    try {
      // Step 1: Tap chip to detect its address
      setStatusMessage("Reading chip...");
      const chipData = await signMessage({
        message: "init",
        format: "text",
      });

      const detectedChipAddress = chipData.address;
      setChipAddress(detectedChipAddress);
      setStatusMessage(`Chip detected`);

      // Step 2: Sign registration with EIP-712
      await new Promise(resolve => setTimeout(resolve, NFC_TAP_COOLDOWN_MS));
      setStatusMessage("Tap again to authorize...");

      const registrationSig = await signTypedData({
        domain: {
          name: "SplitHubRegistry",
          version: "1",
          chainId: BASE_SEPOLIA_CHAIN_ID,
          verifyingContract: registryContract.address,
        },
        types: {
          ChipRegistration: [
            { name: "owner", type: "address" },
            { name: "chipAddress", type: "address" },
          ],
        },
        primaryType: "ChipRegistration",
        message: {
          owner: embeddedWallet,
          chipAddress: detectedChipAddress,
        },
      });

      // Step 3: Check if chip is already registered
      // Use .maybeSingle() instead of .single() - the happy path is 0 rows (chip not registered)
      // .single() throws when 0 rows found, but we WANT 0 rows
      // .maybeSingle() returns null if 0 rows, throws only if >1 rows
      const { data: existingChip, error: chipCheckError } = await supabase
        .from("users")
        .select("chip_address")
        .eq("chip_address", detectedChipAddress.toLowerCase())
        .maybeSingle();

      if (chipCheckError) {
        throw new Error(`Database error: ${chipCheckError.message}`);
      }

      if (existingChip) {
        throw new Error("This chip is already registered");
      }

      // Step 4: Register chip on-chain via relayer
      setFlowState("registering");
      setStatusMessage("Registering chip on blockchain...");

      const relayResponse = await fetch("/api/relay/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer: detectedChipAddress,
          owner: embeddedWallet,
          signature: registrationSig.signature,
        }),
      });

      const relayData = await relayResponse.json();

      if (!relayResponse.ok) {
        throw new Error(relayData.error || "Registration failed");
      }

      // Step 5: Finalize onboarding (updates DB, checks approvals, returns next route)
      await finalizeOnboarding("register", detectedChipAddress);
    } catch (err: unknown) {
      console.error("Registration error:", err);
      setFlowState("error");
      setError(formatNFCError(err));
      setStatusMessage("");
    }
  };

  const handleSkipRegistration = async () => {
    // Finalize onboarding with skip action
    await finalizeOnboarding("skip");
  };

  // Determine if we should show processing state
  const isProcessing = flowState === "tapping" || flowState === "registering";

  return (
    <>
      {/* Onboarding Finalizer - Full screen loader */}
      <OnboardingFinalizer isOpen={flowState === "finalizing"} />

      <div className="space-y-5">
        {/* NFC Icon with Animation */}
        <div className="relative flex items-center justify-center py-6">
          {/* Animated ring effect when processing */}
          {isProcessing && (
            <>
              <div className="absolute w-32 h-32 rounded-full bg-primary/5 animate-ping" />
              <div className="absolute w-28 h-28 rounded-full bg-primary/10 animate-pulse" />
            </>
          )}

          {/* Main NFC Icon */}
          <div
            className={`relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 border-2 border-primary/30 shadow-lg transition-all duration-500 ${
              flowState === "idle" ? "animate-pulse" : ""
            } ${isProcessing ? "scale-110" : "scale-100"}`}
          >
            <Nfc className="w-10 h-10 text-primary" strokeWidth={2} />
          </div>
        </div>

        {/* Title & Status */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-base-content">
            {flowState === "idle"
              ? "Register your chip"
              : flowState === "tapping"
                ? "Reading chip..."
                : flowState === "registering"
                  ? "Registering..."
                  : "Processing..."}
          </h1>
          {statusMessage && flowState !== "idle" && (
            <p className="text-sm text-base-content/60 animate-pulse">{statusMessage}</p>
          )}
          {flowState === "idle" && (
            <p className="text-sm text-base-content/60">Link your NFC chip to your wallet to enable tap-to-pay</p>
          )}
        </div>

        {/* Chip Address Card - Higher in hierarchy */}
        {chipAddress && (
          <div className="bg-base-200/50 backdrop-blur-sm rounded-xl p-4 border border-base-300/50 shadow-sm">
            <p className="text-[10px] text-base-content/50 mb-2 uppercase tracking-wider font-semibold">Chip Address</p>
            <p className="font-mono text-xs text-base-content/90 break-all leading-relaxed">{chipAddress}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/10 border border-error/30 rounded-xl animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
            <span className="text-error text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Register Button - Only show when idle or error */}
        {(flowState === "idle" || flowState === "error") && (
          <>
            <button
              onClick={handleChipRegistration}
              className="w-full py-4 px-6 bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-content font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3"
            >
              <Nfc className="w-5 h-5" />
              Tap chip to register
            </button>

            {/* Skip Button */}
            <button
              onClick={handleSkipRegistration}
              className="w-full py-3 px-6 bg-base-200 hover:bg-base-300 active:scale-[0.98] text-base-content font-medium rounded-xl transition-all duration-200"
            >
              Skip and continue
            </button>
          </>
        )}

        {/* Info Footer - Only show when idle */}
        {flowState === "idle" && (
          <div className="space-y-2">
            <p className="text-center text-xs text-base-content/40">
              This will securely link your NFC chip to your wallet
            </p>
            <p className="text-center text-xs text-base-content/30">You can register your chip later from settings</p>
          </div>
        )}
      </div>
    </>
  );
}

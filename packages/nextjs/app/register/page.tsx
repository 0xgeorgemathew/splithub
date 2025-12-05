"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { AlertCircle, Loader2, Nfc } from "lucide-react";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { supabase } from "~~/lib/supabase";

type FlowState = "idle" | "tapping" | "registering" | "saving" | "success" | "error";

export default function RegisterPage() {
  const router = useRouter();
  const { ready, authenticated, user } = usePrivy();
  const { signMessage, signTypedData } = useHaloChip();
  const { data: registryContract } = useDeployedContractInfo("SplitHubRegistry");

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [chipAddress, setChipAddress] = useState<string | null>(null);

  const embeddedWallet = user?.wallet?.address;
  const twitterHandle = user?.twitter?.username;
  const twitterName = user?.twitter?.name;

  // Check if user already has a chip registered
  useEffect(() => {
    const checkChipRegistration = async () => {
      if (!ready || !authenticated || !user) return;

      const dbUser = await supabase.from("users").select("chip_address").eq("privy_user_id", user.id).single();

      if (dbUser.data?.chip_address) {
        router.replace("/approve");
      }
    };

    checkChipRegistration();
  }, [ready, authenticated, user, router]);

  // Redirect to approve page immediately after successful registration
  useEffect(() => {
    if (flowState === "success") {
      router.replace("/approve");
    }
  }, [flowState, router]);

  // If not authenticated, redirect to home
  if (ready && !authenticated) {
    router.push("/");
    return null;
  }

  const handleChipRegistration = async () => {
    if (!authenticated || !embeddedWallet || !user) {
      setError("Please login with Twitter first");
      return;
    }

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
      await new Promise(resolve => setTimeout(resolve, 300));
      setStatusMessage("Tap again to authorize...");

      const registrationSig = await signTypedData({
        domain: {
          name: "SplitHubRegistry",
          version: "1",
          chainId: 84532,
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
      const { data: existingChip } = await supabase
        .from("users")
        .select("chip_address")
        .eq("chip_address", detectedChipAddress.toLowerCase())
        .single();

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

      // Step 5: Update user record
      setFlowState("saving");
      setStatusMessage("Saving...");

      const { error: updateError } = await supabase
        .from("users")
        .update({ chip_address: detectedChipAddress.toLowerCase() })
        .eq("privy_user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      // Success!
      setFlowState("success");
      setStatusMessage("Complete! Redirecting...");
    } catch (err: any) {
      console.error("Registration error:", err);
      setFlowState("error");
      setError(err.message || "Registration failed");
      setStatusMessage("");
    }
  };

  // Determine if we should dim the bottom nav
  const isProcessing = flowState !== "idle" && flowState !== "error";

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col bg-base-300 relative">
      {/* Dim overlay for bottom nav when processing */}
      {isProcessing && <div className="fixed inset-0 bg-base-300/60 backdrop-blur-sm z-30 pointer-events-none" />}

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24 pt-4 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Premium Progress Indicator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-base-content">Step 1 of 3</span>
              <span className="text-xs text-base-content/50 uppercase tracking-wider">Registering chip</span>
            </div>
            <div className="relative w-full h-1.5 bg-base-200/50 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full transition-all duration-700 ease-out"
                style={{ width: "33.33%" }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-primary/40 rounded-full animate-pulse"
                style={{ width: "33.33%" }}
              />
            </div>
          </div>

          {/* User Info - Subtle */}
          {twitterHandle && (
            <div className="text-center">
              <p className="text-xs text-base-content/50">
                Logged in as <span className="font-semibold text-base-content/70">{twitterName || twitterHandle}</span>{" "}
                <span className="text-base-content/40">@{twitterHandle}</span>
              </p>
            </div>
          )}

          {!ready || flowState === "success" ? (
            /* Loading State */
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6 animate-pulse">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
              <p className="text-base-content/70 text-sm">
                {flowState === "success" ? "Complete! Redirecting..." : "Loading..."}
              </p>
            </div>
          ) : (
            /* Main Registration UI - Premium Layout */
            <div className="space-y-6">
              {/* Title Section */}
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-base-content">
                  {flowState === "idle" ? "Register your chip" : "Registering your chip"}
                </h1>
                <p className="text-sm text-base-content/60 max-w-xs mx-auto">
                  {flowState === "idle"
                    ? "Link your NFC chip to your wallet to enable tap-to-pay"
                    : "We're linking your NFC chip to your wallet on-chain"}
                </p>
              </div>

              {/* NFC Icon Centerpiece with Animation */}
              <div className="relative flex items-center justify-center py-8">
                {/* Animated ring effect when processing */}
                {isProcessing && (
                  <>
                    <div className="absolute w-32 h-32 rounded-full bg-primary/5 animate-ping" />
                    <div className="absolute w-28 h-28 rounded-full bg-primary/10 animate-pulse" />
                  </>
                )}

                {/* Main NFC Icon */}
                <div
                  className={`relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 border-2 border-primary/30 shadow-lg transition-all duration-500 ${
                    flowState === "idle" ? "animate-pulse" : ""
                  } ${isProcessing ? "scale-110" : "scale-100"}`}
                >
                  <Nfc className="w-12 h-12 text-primary" strokeWidth={2} />
                </div>
              </div>

              {/* Status Text */}
              <div className="text-center space-y-1">
                <p className="text-base font-semibold text-base-content">
                  {flowState === "idle"
                    ? "Ready to register"
                    : flowState === "tapping"
                      ? "Reading chip..."
                      : flowState === "registering"
                        ? "Registering..."
                        : flowState === "saving"
                          ? "Saving..."
                          : "Processing..."}
                </p>
                {statusMessage && flowState !== "idle" && (
                  <p className="text-xs text-base-content/60 animate-pulse">{statusMessage}</p>
                )}
              </div>

              {/* Chip Address Card - Compact & Elegant */}
              {chipAddress && (
                <div className="bg-base-200/50 backdrop-blur-sm rounded-xl p-4 border border-base-300/50 shadow-sm">
                  <p className="text-[10px] text-base-content/50 mb-2 uppercase tracking-wider font-semibold">
                    Chip Address
                  </p>
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

              {/* Register Button */}
              {flowState === "idle" || flowState === "error" ? (
                <button
                  onClick={handleChipRegistration}
                  className="w-full py-4 px-6 bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-content font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3"
                >
                  <Nfc className="w-5 h-5" />
                  Tap chip to register
                </button>
              ) : (
                <div className="w-full py-4 px-6 bg-base-200/50 text-base-content/60 font-semibold rounded-xl flex items-center justify-center gap-3 cursor-not-allowed">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {flowState === "tapping"
                    ? "Reading..."
                    : flowState === "registering"
                      ? "Registering..."
                      : "Saving..."}
                </div>
              )}

              {/* Info Footer */}
              {flowState === "idle" && (
                <p className="text-center text-xs text-base-content/40 pt-2">
                  This will securely link your NFC chip to your wallet
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

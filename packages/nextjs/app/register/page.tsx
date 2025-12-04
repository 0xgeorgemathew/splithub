"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { AlertCircle, CheckCircle2, Loader2, Nfc } from "lucide-react";
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

  // If not authenticated, redirect to home (they'll see login there)
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
    setStatusMessage("Hold your device near the NFC chip for 2-3 seconds...");

    try {
      // Step 1: Tap chip to detect its address
      setStatusMessage("Reading chip...");
      const chipData = await signMessage({
        message: "init",
        format: "text",
      });

      const detectedChipAddress = chipData.address;
      setChipAddress(detectedChipAddress);
      setStatusMessage(`Chip detected: ${detectedChipAddress.slice(0, 10)}...`);

      // Step 2: Sign registration with EIP-712
      await new Promise(resolve => setTimeout(resolve, 500));
      setStatusMessage("Tap your chip again to authorize registration...");

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
        throw new Error("This chip is already registered to another user");
      }

      // Step 4: Register chip on-chain via relayer (gasless)
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

      // Step 5: Update user record with chip address
      setFlowState("saving");
      setStatusMessage("Saving your profile...");

      const { error: updateError } = await supabase
        .from("users")
        .update({ chip_address: detectedChipAddress.toLowerCase() })
        .eq("privy_user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      // Success!
      setFlowState("success");
      setStatusMessage("Registration complete!");
      setTimeout(() => router.push("/"), 2000);
    } catch (err: any) {
      console.error("Registration error:", err);
      setFlowState("error");
      setError(err.message || "Registration failed. Please try again.");
      setStatusMessage("");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2 text-slate-900">Welcome to SplitHub</h1>
          <p className="text-slate-600 text-base">Register your NFC chip to start splitting</p>
        </div>

        <div className="card bg-white shadow-lg border border-slate-200">
          <div className="card-body p-6">
            {!ready ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
              </div>
            ) : flowState === "success" ? (
              /* Success State */
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Registration Complete!</h3>
                <p className="text-slate-600">{statusMessage}</p>
              </div>
            ) : (
              /* Chip Registration Flow */
              <div className="space-y-6">
                {/* User Info Display */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-600 mb-2">Logged in as</p>
                  <p className="font-semibold text-slate-900">{twitterName || twitterHandle}</p>
                  <p className="text-sm text-slate-600">@{twitterHandle}</p>
                </div>

                <div className="text-center">
                  <Nfc className="w-20 h-20 mx-auto mb-4 text-slate-700" />
                  <h3 className="text-xl font-semibold mb-2">Register Your NFC Chip</h3>
                  <p className="text-slate-600 mb-4">
                    {flowState === "idle"
                      ? "Tap your NFC chip to complete registration"
                      : statusMessage || "Processing..."}
                  </p>

                  {chipAddress && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-slate-600 mb-1">Chip Address</p>
                      <p className="font-mono text-sm">{chipAddress}</p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800 text-sm">{error}</span>
                  </div>
                )}

                <button
                  onClick={handleChipRegistration}
                  disabled={flowState !== "idle" && flowState !== "error"}
                  className="w-full py-3.5 btn btn-primary"
                >
                  {flowState === "idle" || flowState === "error" ? (
                    <>
                      <Nfc className="w-5 h-5" />
                      Tap Chip to Register
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {flowState === "tapping"
                        ? "Reading Chip..."
                        : flowState === "registering"
                          ? "Registering..."
                          : "Saving..."}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Mail, Nfc, Sparkles, User, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { supabase } from "~~/lib/supabase";

type FlowState = "idle" | "tapping" | "registering" | "saving" | "success" | "error";
type Step = 1 | 2;

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { signMessage } = useHaloChip();
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "SplitHubRegistry" });

  // Form data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Flow state
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Chip data
  const [chipAddress, setChipAddress] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required");
      return;
    }

    // Move to step 2
    setCurrentStep(2);
  };

  const handleChipRegistration = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    setError("");
    setFlowState("tapping");
    setStatusMessage("Hold your device near the NFC chip for 2-3 seconds...");

    try {
      // Step 1: Tap chip to get its address and signature
      setStatusMessage("Reading chip...");

      // Chip signs the owner's wallet address
      const messageToSign = address.toLowerCase();
      const chipResult = await signMessage({
        message: messageToSign,
        format: "text",
      });

      const detectedChipAddress = chipResult.address;
      setChipAddress(detectedChipAddress);
      setStatusMessage(`Chip detected: ${detectedChipAddress.slice(0, 10)}...`);

      // Step 2: Check if chip is already registered
      const { data: existingChip } = await supabase
        .from("users")
        .select("chip_address")
        .eq("chip_address", detectedChipAddress.toLowerCase())
        .single();

      if (existingChip) {
        throw new Error("This chip is already registered to another user");
      }

      // Step 3: Check if wallet is already registered
      const { data: existingUser } = await supabase
        .from("users")
        .select("wallet_address")
        .eq("wallet_address", address.toLowerCase())
        .single();

      if (existingUser) {
        throw new Error("This wallet is already registered");
      }

      // Step 4: Register chip on-chain
      setFlowState("registering");
      setStatusMessage("Registering chip on blockchain...");

      await writeContractAsync({
        functionName: "register",
        args: [detectedChipAddress as `0x${string}`, address, chipResult.signature as `0x${string}`],
      });

      // Step 5: Save to database
      setFlowState("saving");
      setStatusMessage("Saving your profile...");

      const { error: insertError } = await supabase.from("users").insert({
        wallet_address: address.toLowerCase(),
        chip_address: detectedChipAddress.toLowerCase(),
        name: name.trim(),
        email: email.trim(),
      });

      if (insertError) {
        throw insertError;
      }

      // Success!
      setFlowState("success");
      setStatusMessage("Registration complete!");
      setTimeout(() => router.push("/pay"), 2000);
    } catch (err: any) {
      console.error("Registration error:", err);
      setFlowState("error");
      setError(err.message || "Registration failed. Please try again.");
      setStatusMessage("");
    }
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
    setFlowState("idle");
    setError("");
    setStatusMessage("");
    setChipAddress(null);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 mb-3 shadow-md">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 text-slate-900 tracking-tight">Welcome to SplitHub</h1>
          <p className="text-slate-600 text-base font-light">Create your profile to start splitting expenses</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                currentStep === 1 ? "bg-slate-900 text-white" : "bg-emerald-600 text-white"
              }`}
            >
              {currentStep === 1 ? "1" : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <span className={`text-sm font-medium ${currentStep === 1 ? "text-slate-900" : "text-slate-600"}`}>
              Your Info
            </span>
          </div>
          <div className="w-12 h-0.5 bg-slate-300"></div>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                currentStep === 2 ? "bg-slate-900 text-white" : "bg-slate-300 text-slate-600"
              }`}
            >
              2
            </div>
            <span className={`text-sm font-medium ${currentStep === 2 ? "text-slate-900" : "text-slate-600"}`}>
              Tap Chip
            </span>
          </div>
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
                <p className="text-slate-600 mb-6">
                  Please connect your wallet using the button in the header to continue
                </p>
              </div>
            ) : flowState === "success" ? (
              /* Success State */
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Profile Created!</h3>
                <p className="text-slate-600">{statusMessage}</p>
                <p className="text-sm text-slate-500 mt-2">Redirecting to your dashboard...</p>
              </div>
            ) : currentStep === 1 ? (
              /* Step 1: Form */
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Wallet Address */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-slate-600" />
                      Wallet Address
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={address || ""}
                      disabled
                      className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-700 focus:outline-none"
                    />
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                  </div>
                </div>

                {/* Name Input */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-600" />
                      Name
                    </span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                    required
                  />
                </div>

                {/* Email Input */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-600" />
                      Email
                    </span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                    required
                  />
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
                  type="submit"
                  className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!name.trim() || !email.trim()}
                >
                  <Sparkles className="w-5 h-5" />
                  Continue to Chip Registration
                </button>
              </form>
            ) : (
              /* Step 2: Chip Tapping */
              <div className="space-y-6">
                <div className="text-center">
                  <div
                    className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                      flowState === "idle" ? "bg-slate-100" : flowState === "error" ? "bg-red-100" : "bg-blue-100"
                    }`}
                  >
                    {flowState === "idle" || flowState === "error" ? (
                      <Nfc className="w-10 h-10 text-slate-700" />
                    ) : (
                      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-slate-900">Register Your NFC Chip</h3>
                  <p className="text-slate-600 mb-4">
                    {flowState === "idle"
                      ? "Tap your NFC chip to complete registration"
                      : statusMessage || "Processing..."}
                  </p>

                  {chipAddress && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-slate-600 mb-1">Chip Address</p>
                      <p className="font-mono text-sm text-slate-900">{chipAddress}</p>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span className="text-red-800 text-sm">{error}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleChipRegistration}
                    disabled={flowState !== "idle" && flowState !== "error"}
                    className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <button
                    onClick={handleBackToStep1}
                    disabled={flowState !== "idle" && flowState !== "error"}
                    className="w-full py-3 px-6 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg border border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Back to Edit Info
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help Text for Step 2 */}
        {currentStep === 2 && flowState === "idle" && (
          <div className="mt-4 text-center text-sm text-slate-600">
            <p>Make sure NFC is enabled on your device</p>
            <p className="mt-1">Hold your device close to the chip for 2-3 seconds</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AlertCircle, Check, Cpu, Loader2, Nfc, Wallet, Wrench } from "lucide-react";
import { useAccount } from "wagmi";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";

type FlowState = "idle" | "reading" | "signing" | "registering" | "success" | "error";

// Progress steps
const FLOW_STEPS = [
  { key: "reading", label: "Read" },
  { key: "signing", label: "Sign" },
  { key: "registering", label: "Register" },
] as const;

export default function ReRegisterPage() {
  const { address, isConnected } = useAccount();
  const { signMessage, signTypedData } = useHaloChip();
  const { data: registryContract } = useDeployedContractInfo("SplitHubRegistry");
  const { targetNetwork } = useTargetNetwork();

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [chipAddress, setChipAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleReRegister = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!registryContract?.address) {
      setError("Registry contract not found");
      return;
    }

    setError("");
    setTxHash(null);
    setFlowState("reading");
    setStatusMessage("Tap chip");

    try {
      // Step 1: Tap chip to detect its address
      const chipData = await signMessage({
        message: "init",
        format: "text",
      });

      const detectedChipAddress = chipData.address;
      setChipAddress(detectedChipAddress);

      // Step 2: Sign registration with EIP-712
      setFlowState("signing");
      setStatusMessage("Signing...");
      await new Promise(resolve => setTimeout(resolve, 300));

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
          owner: address,
          chipAddress: detectedChipAddress,
        },
      });

      // Step 3: Register chip on-chain via relayer (gasless)
      setFlowState("registering");
      setStatusMessage("Registering...");

      const relayResponse = await fetch("/api/relay/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer: detectedChipAddress,
          owner: address,
          signature: registrationSig.signature,
        }),
      });

      const relayData = await relayResponse.json();

      if (!relayResponse.ok) {
        throw new Error(relayData.error || "Registration failed");
      }

      setTxHash(relayData.txHash);
      setFlowState("success");
      setStatusMessage("Complete!");
    } catch (err: any) {
      console.error("Re-registration error:", err);
      setFlowState("error");
      setError(err.message || "Registration failed. Try again.");
      setStatusMessage("");
    }
  };

  const handleReset = () => {
    setFlowState("idle");
    setError("");
    setStatusMessage("");
    setChipAddress(null);
    setTxHash(null);
  };

  // Helper to get current step index
  const getCurrentStepIndex = () => {
    const stepMap: Record<string, number> = {
      reading: 0,
      signing: 1,
      registering: 2,
    };
    return stepMap[flowState] ?? -1;
  };

  const isProcessing = ["reading", "signing", "registering"].includes(flowState);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4 pb-24">
      <div className="w-full max-w-md mx-auto">
        {!isConnected ? (
          /* Not Connected State */
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4 shadow-md">
              <Wallet className="w-8 h-8 text-base-content/50" />
            </div>
            <p className="text-base-content/50 text-center">Connect your wallet to register</p>
          </div>
        ) : flowState === "success" ? (
          /* Success State */
          <div className="flex flex-col items-center justify-center mt-12 fade-in-up">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success/20 mb-6 success-glow">
              <Check className="w-12 h-12 text-success" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-base-content">Registered!</h3>

            {/* Chip Address */}
            {chipAddress && (
              <div className="flex items-center gap-2 px-4 py-2 bg-base-100 border border-success/30 rounded-full mb-4">
                <Cpu className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-base-content">
                  {chipAddress.slice(0, 6)}...{chipAddress.slice(-4)}
                </span>
              </div>
            )}

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
              {flowState === "reading" && (
                <>
                  <div className="nfc-pulse-ring" />
                  <div className="nfc-pulse-ring" style={{ animationDelay: "0.5s" }} />
                </>
              )}
            </div>

            <h3 className="text-lg font-semibold mb-1 text-base-content">{statusMessage}</h3>
            <p className="text-base-content/50 text-sm">
              {flowState === "reading" && "Hold device near chip"}
              {flowState === "signing" && "Authorizing registration"}
              {flowState === "registering" && "Writing to blockchain"}
            </p>

            {/* Show detected chip */}
            {chipAddress && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full mt-4">
                <Cpu className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-base-content">
                  {chipAddress.slice(0, 6)}...{chipAddress.slice(-4)}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Main UI - Idle State */
          <div className="flex flex-col items-center pt-6">
            {/* Dev Mode Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-base-100 border border-primary/30 rounded-full mb-6">
              <Wrench className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Dev Mode</span>
            </div>

            {/* Info Pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {/* Wallet Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-base-content">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>

              {/* Registry Pill */}
              {registryContract && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full">
                  <Cpu className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-base-content">
                    {registryContract.address.slice(0, 6)}...{registryContract.address.slice(-4)}
                  </span>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-base-content mb-1">Register Chip</h2>
              <p className="text-base-content/50 text-sm">Link your NFC chip to your wallet</p>
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
                onClick={handleReRegister}
                disabled={!registryContract}
                className="nfc-chip-btn flex flex-col items-center justify-center text-primary-content disabled:opacity-50"
              >
                <Nfc className="w-12 h-12 mb-1" />
                <span className="text-sm font-bold">Tap to Register</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

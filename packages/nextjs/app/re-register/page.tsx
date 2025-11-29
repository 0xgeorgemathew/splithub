"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Nfc, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

type FlowState = "idle" | "tapping" | "registering" | "success" | "error";

export default function ReRegisterPage() {
  const { address, isConnected } = useAccount();
  const { signMessage, signTypedData } = useHaloChip();
  const { data: registryContract } = useDeployedContractInfo("SplitHubRegistry");

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
          owner: address,
          chipAddress: detectedChipAddress,
        },
      });

      // Step 3: Register chip on-chain via relayer (gasless)
      setFlowState("registering");
      setStatusMessage("Registering chip on blockchain...");

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

      console.log("✅ Re-registration transaction:", relayData.txHash);
      setTxHash(relayData.txHash);

      // Success!
      setFlowState("success");
      setStatusMessage("Chip re-registered on-chain successfully!");
    } catch (err: any) {
      console.error("Re-registration error:", err);
      setFlowState("error");
      setError(err.message || "Re-registration failed. Please try again.");
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

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2 text-slate-900 tracking-tight">Re-register Chip</h1>
        </div>

        {/* Info Banner */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Development Mode:</strong> Used for registering the chip with the newly deployed contract
          </p>
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
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Re-registration Successful!</h3>
                <p className="text-slate-600 mb-4">{statusMessage}</p>

                {chipAddress && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-slate-600 mb-1">Chip Address</p>
                    <p className="font-mono text-sm text-slate-900 break-all">{chipAddress}</p>
                  </div>
                )}

                {txHash && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-slate-600 mb-1">Transaction Hash</p>
                    <p className="font-mono text-xs text-slate-900 break-all">{txHash}</p>
                  </div>
                )}

                {registryContract && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-slate-600 mb-1">Registry Contract</p>
                    <p className="font-mono text-xs text-slate-900 break-all">{registryContract.address}</p>
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-all duration-200"
                >
                  Re-register Another Chip
                </button>
              </div>
            ) : (
              /* Main Flow */
              <div className="space-y-6">
                {/* Wallet Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-600 mb-1">Connected Wallet</p>
                  <p className="font-mono text-sm text-slate-900 break-all">{address}</p>
                </div>

                {/* Current Contract */}
                {registryContract && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-600 mb-1">Registry Contract</p>
                    <p className="font-mono text-xs text-slate-900 break-all">{registryContract.address}</p>
                  </div>
                )}

                {/* Status Icon */}
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
                  {statusMessage && <p className="text-slate-600 mb-4">{statusMessage}</p>}

                  {chipAddress && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-slate-600 mb-1">Chip Address</p>
                      <p className="font-mono text-sm text-slate-900 break-all">{chipAddress}</p>
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

                {/* Action Button */}
                <button
                  onClick={handleReRegister}
                  disabled={flowState !== "idle" && flowState !== "error"}
                  className="w-full py-3.5 px-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {flowState === "idle" || flowState === "error" ? (
                    <>Tap Chip to Re-register</>
                  ) : (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {flowState === "tapping" ? "Reading Chip..." : "Registering..."}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        {isConnected && flowState === "idle" && (
          <div className="mt-4 text-center text-sm text-slate-600">
            <p>Make sure NFC is enabled on your device</p>
            <p className="mt-1">Hold your device close to the chip for 2-3 seconds</p>
          </div>
        )}
      </div>
    </div>
  );
}

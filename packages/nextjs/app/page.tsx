"use client";

import { Cpu } from "lucide-react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export default function Home() {
  const { address, isConnected } = useAccount();

  const { data: chipAddress, isLoading } = useScaffoldReadContract({
    contractName: "SplitHubRegistry",
    functionName: "signerOf",
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  // Check if chip is registered (not zero address)
  const hasChip = chipAddress && chipAddress !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4">
      {/* Chip Status Pill */}
      {isConnected && (
        <div className="flex justify-center mt-4">
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-base-100 border border-base-300 rounded-full">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-base-content/60">Loading chip...</span>
            </div>
          ) : hasChip ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-base-100 border border-primary/50 rounded-full shadow-sm">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-base-content">
                {chipAddress?.slice(0, 6)}...{chipAddress?.slice(-4)}
              </span>
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-base-100 border border-base-300 rounded-full">
              <Cpu className="w-4 h-4 text-base-content/40" />
              <span className="text-sm text-base-content/50">No chip registered</span>
            </div>
          )}
        </div>
      )}

      {/* Welcome Message for disconnected users */}
      {!isConnected && (
        <div className="flex flex-col items-center justify-center mt-20">
          <p className="text-base-content/50 text-center">Connect your wallet to get started</p>
        </div>
      )}
    </div>
  );
}

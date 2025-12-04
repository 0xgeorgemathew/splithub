"use client";

import { Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { FriendBalancesList } from "~~/components/home/FriendBalancesList";

export default function SplitsPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) {
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-200 mb-4">
            <Wallet className="w-8 h-8 text-base-content/50" />
          </div>
          <p className="text-base-content/50 text-lg">Connect your wallet to view splits</p>
        </div>
      </div>
    );
  }

  return <FriendBalancesList userWallet={address} />;
}

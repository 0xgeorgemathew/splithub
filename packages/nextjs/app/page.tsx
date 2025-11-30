"use client";

import { useAccount } from "wagmi";
import { FriendBalancesList } from "~~/components/home/FriendBalancesList";

export default function Home() {
  const { address, isConnected } = useAccount();

  // Show welcome message when not connected
  if (!isConnected || !address) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-base-200 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-base-content/50 text-lg">Connect your wallet to get started</p>
        </div>
      </div>
    );
  }

  // Show friend balances list when connected
  return <FriendBalancesList userWallet={address} />;
}

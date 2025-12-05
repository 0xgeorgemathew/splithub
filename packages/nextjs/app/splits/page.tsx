"use client";

import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
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

  return (
    <>
      <FriendBalancesList />

      {/* Add Expense FAB */}
      <Link
        href="/expense/add"
        className="fixed bottom-24 right-6 z-40 flex items-center gap-2 px-6 py-4 bg-primary hover:bg-primary/90 text-primary-content font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
      >
        <Plus className="w-5 h-5" />
        Add Expense
      </Link>
    </>
  );
}

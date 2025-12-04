"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2, LogIn, Plus } from "lucide-react";
import { FriendBalancesList } from "~~/components/home/FriendBalancesList";

export default function Home() {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <h1 className="text-3xl font-bold mb-4">Welcome to SplitHub</h1>
        <p className="text-base-content/60 mb-6 text-center">Tap-to-pay bill splitting with NFC</p>
        <button onClick={login} className="btn btn-primary gap-2">
          <LogIn className="w-5 h-5" />
          Login with Twitter
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-6">Your Balances</h1>
      <FriendBalancesList />

      {/* Floating Add Expense Button */}
      <Link
        href="/expense/add"
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-content rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40"
        style={{
          boxShadow: "0 4px 20px rgba(242, 169, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)",
        }}
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </Link>
    </div>
  );
}

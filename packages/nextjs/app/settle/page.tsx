"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { User } from "lucide-react";
import { type Address, isAddress } from "viem";
import { SettleFlow } from "~~/components/settle/SettleFlow";
import { TOKENS } from "~~/config/tokens";

// Demo recipient used when /settle is opened without a `to` address.
const DEFAULT_RECIPIENT: Address = "0x09a6f8C0194246c365bB42122E872626460F8a71";
const DEFAULT_AMOUNT = "1";

function SettleContent() {
  const searchParams = useSearchParams();
  const to = searchParams.get("to");
  const amount = searchParams.get("amount");
  const recipient = to && isAddress(to) ? (to as Address) : DEFAULT_RECIPIENT;
  const parsedAmount = amount && Number(amount) > 0 ? amount : DEFAULT_AMOUNT;

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col justify-center">
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-base-content/60">Tap to pay</p>
            <div className="flex items-center gap-2 rounded-full border border-base-300 bg-base-200/50 px-3 py-1">
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-xs text-base-content">
                {recipient.slice(0, 6)}...{recipient.slice(-4)}
              </span>
            </div>
          </div>
          <SettleFlow params={{ recipient, token: TOKENS.USDC, amount: parsedAmount }} />
        </div>
      </div>
    </div>
  );
}

export default function SettlePage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto">
        <Suspense>
          <SettleContent />
        </Suspense>
      </div>
    </div>
  );
}

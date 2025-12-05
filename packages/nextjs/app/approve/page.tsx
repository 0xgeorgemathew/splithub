"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import the heavy wagmi/viem component with no SSR
const ApprovalFlow = dynamic(
  () => import("~~/components/approve/ApprovalFlow").then(m => ({ default: m.ApprovalFlow })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center mt-20 space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-4 animate-pulse">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
        <div className="space-y-2">
          <p className="text-base-content font-semibold">Step 2 of 3</p>
          <p className="text-base-content/60 text-sm">Loading approval page...</p>
        </div>
      </div>
    ),
  },
);

export default function ApprovePage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-300 p-4 pb-24 relative">
      <div className="w-full max-w-md mx-auto">
        <ApprovalFlow />
      </div>
    </div>
  );
}

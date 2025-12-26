"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";

// Check if coming from onboarding flow (prevents loading flash)
const checkSkipFlag = () => {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("skipLoadingStates") === "true";
};

// Loading UI component (reused in dynamic import and page)
const LoadingUI = () => (
  <div className="flex flex-col items-center justify-center mt-20 space-y-4">
    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-4 animate-pulse">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
    <div className="space-y-2">
      <p className="text-base-content font-semibold">Step 2 of 3</p>
      <p className="text-base-content/60 text-sm">Loading approval page...</p>
    </div>
  </div>
);

// Dynamically import the heavy wagmi/viem component with no SSR
const ApprovalFlow = dynamic(
  () => import("~~/components/approve/ApprovalFlow").then(m => ({ default: m.ApprovalFlow })),
  {
    ssr: false,
    loading: () => (checkSkipFlag() ? null : <LoadingUI />),
  },
);

export default function ApprovePage() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  // Clear skip flag after mount (single side effect)
  useEffect(() => {
    if (checkSkipFlag()) {
      sessionStorage.removeItem("skipLoadingStates");
    }
  }, []);

  // Auth redirect guard
  if (ready && !authenticated) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-300 p-4 pb-24 relative">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto">{!ready ? <LoadingUI /> : <ApprovalFlow />}</div>
    </div>
  );
}

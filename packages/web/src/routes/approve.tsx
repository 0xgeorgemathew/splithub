import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { clientOnly } from "~~/utils/clientOnly";

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
const ApprovalFlow = clientOnly(
  () => import("~~/components/approve/ApprovalFlow").then(m => m.ApprovalFlow),
  () => (checkSkipFlag() ? null : <LoadingUI />),
);

function ApprovePage() {
  const { ready, authenticated } = usePrivy();

  // Clear skip flag after mount (single side effect)
  useEffect(() => {
    if (checkSkipFlag()) {
      sessionStorage.removeItem("skipLoadingStates");
    }
  }, []);

  // Auth redirect guard
  if (ready && !authenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-300 p-4 pb-24 relative">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto">{!ready ? <LoadingUI /> : <ApprovalFlow />}</div>
    </div>
  );
}

export const Route = createFileRoute("/approve")({
  component: ApprovePage,
});

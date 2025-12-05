import { Loader2 } from "lucide-react";

export default function ApproveLoading() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-base-300">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
        <div className="space-y-2">
          <p className="text-base-content font-semibold">Step 2 of 3</p>
          <p className="text-base-content/60 text-sm">Loading approval page...</p>
        </div>
      </div>
    </div>
  );
}

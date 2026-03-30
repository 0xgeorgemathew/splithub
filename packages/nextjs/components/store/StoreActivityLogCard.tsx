import type { CheckoutLog } from "./checkout/shared";
import { Sparkles } from "lucide-react";

export function StoreActivityLogCard({ logs }: { logs: CheckoutLog[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-base-200/60 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Checkout Log</h2>
      </div>
      <div className="mt-4 space-y-3 font-mono text-xs">
        {logs.length ? (
          logs.map((log, index) => (
            <div key={`${log.time}-${index}`} className="rounded-2xl bg-base-100/80 px-4 py-3">
              <div className="text-base-content/40">{log.time}</div>
              <div
                className={
                  log.tone === "success" ? "text-success" : log.tone === "error" ? "text-error" : "text-base-content/80"
                }
              >
                {log.message}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-base-content/55">
            Structured checkout logs appear here as the flow executes.
          </div>
        )}
      </div>
    </div>
  );
}

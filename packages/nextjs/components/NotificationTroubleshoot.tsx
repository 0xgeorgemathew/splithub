"use client";

import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";

interface NotificationTroubleshootProps {
  pendingDuration: number;
  onRetry?: () => void;
  minimal?: boolean;
}

const STUCK_THRESHOLD = 15000; // 15 seconds

export function NotificationTroubleshoot({ pendingDuration, onRetry, minimal = false }: NotificationTroubleshootProps) {
  if (pendingDuration < STUCK_THRESHOLD) {
    return null;
  }

  if (minimal) {
    return (
      <div className="mt-2 text-xs text-warning">
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Taking longer than expected.{" "}
          <button onClick={onRetry} className="underline">
            Retry
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-warning mb-2">Notifications Stuck?</h3>
          <p className="text-sm text-base-content/70 mb-3">
            If the subscribe button has been spinning for a while, try these steps:
          </p>
          <ol className="text-sm text-base-content/70 space-y-2 mb-3 list-decimal list-inside">
            <li>
              Click the <span className="font-mono bg-base-300 px-1 rounded">lock</span> icon in your URL bar
            </li>
            <li>Find &quot;Notifications&quot; and click &quot;Reset&quot; or &quot;Clear&quot;</li>
            <li>Refresh this page</li>
            <li>Click &quot;Enable Notifications&quot; again</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-warning/20 hover:bg-warning/30 text-warning rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            )}
            <a
              href="https://support.google.com/chrome/answer/3220216"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-base-300/50 hover:bg-base-300 rounded-lg text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Detailed instructions
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

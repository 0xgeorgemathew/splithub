"use client";

import { useEffect, useRef } from "react";
import { LogEntry } from "./types";
import { motion } from "framer-motion";
import { Terminal, Trash2 } from "lucide-react";

interface DebugTerminalProps {
  logs: LogEntry[];
  onClear: () => void;
}

const getLogColor = (type: LogEntry["type"]) => {
  switch (type) {
    case "info":
      return "text-info";
    case "success":
      return "text-success";
    case "error":
      return "text-error";
    case "data":
      return "text-warning";
    default:
      return "text-base-content";
  }
};

export function DebugTerminal({ logs, onClear }: DebugTerminalProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when logs change
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <motion.div
      className="card bg-base-300 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="card-body p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="card-title text-sm">
            <Terminal className="w-4 h-4" />
            Debug Log
          </h2>
          <button className="btn btn-xs btn-ghost gap-1" onClick={onClear}>
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
        <div ref={logContainerRef} className="bg-base-100 rounded-lg p-2 h-48 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-base-content/40 italic">No logs yet. Tap to connect...</p>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className="flex gap-2 leading-relaxed">
                <span className="text-base-content/40 flex-shrink-0">{entry.time}</span>
                <span className={`${getLogColor(entry.type)} break-all`}>{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

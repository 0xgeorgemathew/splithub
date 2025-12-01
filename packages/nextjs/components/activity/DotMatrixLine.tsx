"use client";

import { ExternalLink } from "lucide-react";

interface DotMatrixLineProps {
  timestamp?: string;
  prefix?: string;
  value: string;
  href?: string;
  variant?: "default" | "success" | "dimmed";
  isAnimating?: boolean;
  confirmations?: number;
}

export function DotMatrixLine({
  timestamp,
  prefix,
  value,
  href,
  variant = "default",
  isAnimating = false,
  confirmations,
}: DotMatrixLineProps) {
  const variantClasses = {
    default: "",
    success: "dot-matrix-line-success",
    dimmed: "opacity-50",
  };

  const content = (
    <>
      {/* Timestamp */}
      {timestamp && <span className="dot-matrix-timestamp">{timestamp}</span>}

      {/* Prefix */}
      {prefix && <span className="dot-matrix-prefix">{prefix}</span>}

      {/* Value with optional typing animation */}
      <span className={isAnimating ? "dot-matrix-typing" : ""}>{value}</span>

      {/* External link icon */}
      {href && <ExternalLink className="w-3 h-3 ml-1 inline-block opacity-70" />}

      {/* Confirmation dots */}
      {confirmations !== undefined && (
        <span className="dot-matrix-conf-dots" aria-label={`${confirmations} of 3 confirmations`}>
          {[0, 1, 2].map(i => (
            <span key={i} className={`dot-matrix-conf-dot ${i < confirmations ? "filled" : ""}`} aria-hidden="true" />
          ))}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`dot-matrix-line visible ${variantClasses[variant]}`}
      >
        {content}
      </a>
    );
  }

  return <div className={`dot-matrix-line visible ${variantClasses[variant]}`}>{content}</div>;
}

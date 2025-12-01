"use client";

import { ReactNode } from "react";

interface DotMatrixDisplayProps {
  variant?: "amber" | "green";
  children: ReactNode;
  className?: string;
}

export function DotMatrixDisplay({ variant = "amber", children, className = "" }: DotMatrixDisplayProps) {
  const variantClasses = {
    amber: "dot-matrix-amber",
    green: "dot-matrix-green",
  };

  return (
    <div
      className={`dot-matrix-container ${variantClasses[variant]} ${className}`}
      role="log"
      aria-label="Transaction status display"
      aria-live="polite"
    >
      {/* Dot grid overlay */}
      <div className="dot-matrix-grid" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 space-y-0.5">{children}</div>
    </div>
  );
}

"use client";

import { ReactNode } from "react";
import { POSState } from "./POSFullScreen";

interface POSHardwareFrameProps {
  children: ReactNode;
  state: POSState;
}

export function POSHardwareFrame({ children, state }: POSHardwareFrameProps) {
  const isProcessing = state === "sending" || state === "confirming";

  return (
    <div className="pos-hardware-frame">
      {/* Top speaker grille */}
      <div className="pos-speaker-grille">
        <div className="pos-speaker-slot" />
        <div className="pos-speaker-slot" />
        <div className="pos-speaker-slot" />
      </div>

      {/* Status LED */}
      <div className="pos-led-container">
        <div
          className={`pos-led ${
            state === "success" ? "pos-led-success" : isProcessing ? "pos-led-processing" : "pos-led-ready"
          }`}
        />
      </div>

      {/* Main screen area */}
      <div className="pos-screen">
        {/* Screen bezel highlight */}
        <div className="pos-screen-bezel" />

        {/* Content */}
        <div className="pos-screen-content">{children}</div>
      </div>

      {/* Bottom branding area */}
      <div className="pos-branding">
        <span className="pos-brand-text">SPLITHUB</span>
        <div className="pos-brand-accent" />
      </div>

      {/* Card slot indicator */}
      <div className="pos-card-slot">
        <div className="pos-card-slot-inner" />
      </div>
    </div>
  );
}

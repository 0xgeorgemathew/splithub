"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

type LEDState = "idle" | "ready" | "processing" | "success";

interface ActivityDeviceFrameProps {
  children: ReactNode;
  ledState?: LEDState;
  onClose?: () => void;
}

export function ActivityDeviceFrame({ children, ledState = "ready", onClose }: ActivityDeviceFrameProps) {
  const ledClass = `activity-device-led activity-device-led-${ledState}`;

  return (
    <div className="activity-device-frame">
      {/* Device header with speaker grille, LED, and optional close button */}
      <div className="activity-device-header">
        <div className="activity-device-speaker">
          <div className="activity-device-speaker-slot" />
          <div className="activity-device-speaker-slot" />
          <div className="activity-device-speaker-slot" />
        </div>
        <div className={ledClass} />
        {onClose && (
          <button className="activity-device-close-btn" onClick={onClose} aria-label="Close activity terminal">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Device screen area */}
      <div className="activity-device-screen">
        <div className="activity-device-screen-content">{children}</div>
      </div>

      {/* Device footer with branding */}
      <div className="activity-device-footer">
        <span className="activity-device-brand">SPLITHUB</span>
        <span className="activity-device-model">ACTIVITY TERMINAL</span>
      </div>
    </div>
  );
}

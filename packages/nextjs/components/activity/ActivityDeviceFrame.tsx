"use client";

import { ReactNode } from "react";

type LEDState = "idle" | "ready" | "processing" | "success";

interface ActivityDeviceFrameProps {
  children: ReactNode;
  ledState?: LEDState;
}

export function ActivityDeviceFrame({ children, ledState = "ready" }: ActivityDeviceFrameProps) {
  const ledClass = `activity-device-led activity-device-led-${ledState}`;

  return (
    <div className="activity-device-frame">
      {/* Device header with speaker grille and LED */}
      <div className="activity-device-header">
        <div className="activity-device-speaker">
          <div className="activity-device-speaker-slot" />
          <div className="activity-device-speaker-slot" />
          <div className="activity-device-speaker-slot" />
        </div>
        <div className={ledClass} />
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

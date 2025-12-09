"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { initOneSignal, loginOneSignal, logoutOneSignal } from "~~/lib/onesignal";

export const OneSignalProvider = ({ children }: { children: React.ReactNode }) => {
  const { ready, authenticated, user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const [sdkReady, setSdkReady] = useState(false);

  // Initialize OneSignal SDK first
  useEffect(() => {
    const init = async () => {
      await initOneSignal();
      setSdkReady(true);
    };
    init();
  }, []);

  // Only call login/logout after SDK is ready
  useEffect(() => {
    if (!sdkReady || !ready) return;

    if (authenticated && walletAddress) {
      loginOneSignal(walletAddress);
    } else {
      logoutOneSignal();
    }
  }, [sdkReady, ready, authenticated, walletAddress]);

  return <>{children}</>;
};

"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { initOneSignal, loginOneSignal, logoutOneSignal } from "~~/lib/onesignal";

export const OneSignalProvider = ({ children }: { children: React.ReactNode }) => {
  const { ready, authenticated, user } = usePrivy();
  const walletAddress = user?.wallet?.address;

  // Track if user was previously authenticated to detect logout vs initial load
  const wasAuthenticated = useRef<boolean | null>(null);
  // Track the wallet we logged in with to detect wallet changes
  const loggedInWallet = useRef<string | null>(null);

  // Initialize OneSignal and handle login in a single effect
  // This ensures login happens as soon as possible after SDK init
  useEffect(() => {
    if (!ready) return;

    const setupOneSignal = async () => {
      // Initialize SDK first
      await initOneSignal();

      // If user is authenticated with a wallet, login immediately
      if (authenticated && walletAddress) {
        const success = await loginOneSignal(walletAddress);
        if (success) {
          loggedInWallet.current = walletAddress.toLowerCase();
        }
        wasAuthenticated.current = true;
      } else if (wasAuthenticated.current === true) {
        // User was previously authenticated but now isn't - this is a logout
        await logoutOneSignal();
        loggedInWallet.current = null;
        wasAuthenticated.current = false;
      } else {
        // Initial load without authentication - don't call logout
        // Just mark that we've checked
        wasAuthenticated.current = false;
      }
    };

    setupOneSignal();
  }, [ready, authenticated, walletAddress]);

  // Handle wallet changes (e.g., user switches wallet)
  useEffect(() => {
    if (!ready || !authenticated || !walletAddress) return;

    const currentWallet = walletAddress.toLowerCase();
    if (loggedInWallet.current && loggedInWallet.current !== currentWallet) {
      // Wallet changed, re-login with new wallet
      console.log("[OneSignal] Wallet changed, re-logging in");
      loginOneSignal(walletAddress).then(success => {
        if (success) {
          loggedInWallet.current = currentWallet;
        }
      });
    }
  }, [ready, authenticated, walletAddress]);

  return <>{children}</>;
};

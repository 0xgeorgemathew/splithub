"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { getUserByPrivyId, syncPrivyUser } from "~~/services/userService";

export const UserSyncWrapper = ({ children }: { children: React.ReactNode }) => {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();
  const hasSynced = useRef(false);
  const hasPrefetched = useRef(false);

  // Prefetch onboarding routes as soon as user is authenticated
  useEffect(() => {
    if (ready && authenticated && !hasPrefetched.current) {
      // Prefetch all possible routes to warm up compilation
      router.prefetch("/register");
      router.prefetch("/approve");
      router.prefetch("/splits");
      hasPrefetched.current = true;
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    const checkAndSyncUser = async () => {
      if (!ready || !authenticated || !user) return;

      // Skip if already synced (or attempted) in this session
      if (hasSynced.current) return;

      // Mark as synced immediately to prevent retry loops on errors
      hasSynced.current = true;

      try {
        // Sync user data to Supabase (only once per session)
        await syncPrivyUser(user);

        // Check user's onboarding status
        const dbUser = await getUserByPrivyId(user.id);

        if (!dbUser) return;

        // Determine the correct page based on onboarding state
        const hasChip = dbUser.chip_address || dbUser.chip_registration_status === "skipped";
        const hasApprovals = dbUser.approval_status === "completed";

        // Define onboarding route based on completion state
        let targetRoute: string | null = null;

        if (!hasChip) {
          targetRoute = "/register";
        } else if (!hasApprovals) {
          targetRoute = "/approve";
        }
        // If both complete, no redirect needed (user can access all pages)

        // Only redirect if:
        // 1. We determined a target route
        // 2. User is not already on that route or a later step
        if (targetRoute) {
          const isOnOnboardingPath = pathname === "/register" || pathname === "/approve";

          // If user is on home page or wrong onboarding step, redirect to correct step
          if (pathname === "/" || (isOnOnboardingPath && pathname !== targetRoute)) {
            router.replace(targetRoute);
          }
        }
      } catch (error) {
        console.error("User sync error:", error);
        // Don't reset hasSynced - prevent infinite retry loops that trigger rate limits
      }
    };

    checkAndSyncUser();
  }, [ready, authenticated, user, pathname, router]);

  return <>{children}</>;
};

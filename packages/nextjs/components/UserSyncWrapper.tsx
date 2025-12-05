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

      // Skip if already synced in this session
      if (hasSynced.current) return;

      try {
        // Sync user data to Supabase (only once per session)
        await syncPrivyUser(user);
        hasSynced.current = true;

        // Check if user has registered their chip
        const dbUser = await getUserByPrivyId(user.id);

        // Don't redirect from these pages (they're part of the onboarding flow)
        const excludedPaths = ["/register", "/approve", "/re-register"];
        const shouldSkipRedirect = excludedPaths.some(path => pathname.startsWith(path));

        if (shouldSkipRedirect) return;

        // Redirect logic based on user state
        if (dbUser && !dbUser.chip_address) {
          // No chip registered → go to register immediately
          router.replace("/register");
        }
        // User with chip can access all pages including home page
      } catch (error) {
        console.error("User sync error:", error);
      }
    };

    checkAndSyncUser();
  }, [ready, authenticated, user, pathname, router]);

  return <>{children}</>;
};

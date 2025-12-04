"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { getUserByPrivyId, syncPrivyUser } from "~~/services/userService";

export const UserSyncWrapper = ({ children }: { children: React.ReactNode }) => {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAndSyncUser = async () => {
      if (!ready || !authenticated || !user) return;

      try {
        // Sync user data to Supabase
        await syncPrivyUser(user);

        // Check if user has registered their chip
        const dbUser = await getUserByPrivyId(user.id);

        // If no chip registered and not already on register page, redirect
        if (dbUser && !dbUser.chip_address && pathname !== "/register") {
          router.push("/register");
        }
      } catch (error) {
        console.error("User sync error:", error);
      }
    };

    checkAndSyncUser();
  }, [ready, authenticated, user, pathname, router]);

  return <>{children}</>;
};

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { type User } from "~~/lib/supabase";
import { getUserByPrivyId } from "~~/services/userService";

export function useCurrentUser() {
  const { user: privyUser, ready, authenticated } = usePrivy();
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!ready || !authenticated || !privyUser?.id) {
        setUserData(null);
        setIsLoading(false);
        return;
      }

      try {
        const user = await getUserByPrivyId(privyUser.id);
        setUserData(user);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [ready, authenticated, privyUser?.id]);

  return {
    user: userData,
    isLoading,
    walletAddress: privyUser?.wallet?.address || null,
    chipAddress: userData?.chip_address || null,
    twitterHandle: privyUser?.twitter?.username || null,
    profilePic: privyUser?.twitter?.profilePictureUrl || null,
  };
}

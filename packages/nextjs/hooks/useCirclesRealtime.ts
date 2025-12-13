import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { type CircleWithMembersAndOwnership, RealtimeChannel, type User, supabase } from "~~/lib/supabase";
import { getCircleWithMembers, getCirclesAsMember, getCirclesByCreator } from "~~/services/circleService";

// Fetch user profile by wallet address
async function getUserByWallet(walletAddress: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  if (error) return null;
  return data as User;
}

export const useCirclesRealtime = () => {
  const { user, authenticated } = usePrivy();
  const [circles, setCircles] = useState<CircleWithMembersAndOwnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelsRef = useRef<RealtimeChannel[]>([]);
  const isMountedRef = useRef(true);

  const walletAddress = authenticated ? (user?.wallet?.address?.toLowerCase() ?? null) : null;

  // Fetch circles with members (both created and member-of)
  const fetchCircles = useCallback(async () => {
    if (!walletAddress) {
      setCircles([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch current user profile, creator circles, and member circles in parallel
      const [currentUserProfile, creatorCircles, memberCircles] = await Promise.all([
        getUserByWallet(walletAddress),
        getCirclesByCreator(walletAddress),
        getCirclesAsMember(walletAddress),
      ]);

      // Fetch full details for creator circles and include creator in members
      const creatorCirclesWithMembers: CircleWithMembersAndOwnership[] = [];
      for (const circle of creatorCircles) {
        const withMembers = await getCircleWithMembers(circle.id);
        if (withMembers) {
          // Include the creator (current user) in the members array for display
          const membersWithCreator = currentUserProfile
            ? [currentUserProfile, ...withMembers.members]
            : withMembers.members;
          creatorCirclesWithMembers.push({ ...withMembers, members: membersWithCreator, isOwner: true });
        }
      }

      // Create set of creator circle IDs for deduplication
      const creatorCircleIds = new Set(creatorCircles.map(c => c.id));

      // Filter member circles and include the circle creator in members for display
      const memberCirclesFiltered = memberCircles.filter(c => !creatorCircleIds.has(c.id));
      const memberCirclesWithOwnership: CircleWithMembersAndOwnership[] = [];
      for (const circle of memberCirclesFiltered) {
        // Fetch the circle creator's profile to include in display
        const creatorProfile = await getUserByWallet(circle.creator_wallet);
        const membersWithCreator = creatorProfile ? [creatorProfile, ...circle.members] : circle.members;
        memberCirclesWithOwnership.push({ ...circle, members: membersWithCreator, isOwner: false });
      }

      // Combine: creator circles first, then member circles
      const allCircles = [...creatorCirclesWithMembers, ...memberCirclesWithOwnership];

      if (isMountedRef.current) {
        setCircles(allCircles);
      }
    } catch (err) {
      console.error("Error fetching circles:", err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load circles");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!walletAddress) {
      setCircles([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchCircles();

    // Subscribe to circles table changes (for circles created by this user)
    const circlesChannel = supabase
      .channel(`circles_${walletAddress}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "circles",
          filter: `creator_wallet=eq.${walletAddress}`,
        },
        fetchCircles,
      )
      .subscribe();

    // Subscribe to circle_members table changes for user's membership
    // This triggers when user is added/removed from any circle
    const membershipChannel = supabase
      .channel(`circle_membership_${walletAddress}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "circle_members",
          filter: `member_wallet=eq.${walletAddress}`,
        },
        fetchCircles,
      )
      .subscribe();

    // Subscribe to all circle_members changes (for member list updates)
    const circleMembersChannel = supabase
      .channel(`circle_members_${walletAddress}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "circle_members",
        },
        fetchCircles,
      )
      .subscribe();

    // Subscribe to circles updates (name changes, deletions, active status)
    const circlesUpdateChannel = supabase
      .channel(`circles_updates_${walletAddress}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "circles",
        },
        fetchCircles,
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "circles",
        },
        fetchCircles,
      )
      .subscribe();

    // Subscribe to users table changes (for member profile updates)
    const usersChannel = supabase
      .channel(`users_${walletAddress}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
        },
        fetchCircles,
      )
      .subscribe();

    channelsRef.current = [circlesChannel, membershipChannel, circleMembersChannel, circlesUpdateChannel, usersChannel];

    // Re-sync on window focus
    const handleFocus = () => fetchCircles();
    window.addEventListener("focus", handleFocus);

    // Legacy event support
    const handleRefresh = () => fetchCircles();
    window.addEventListener("refreshCircles", handleRefresh);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("refreshCircles", handleRefresh);
    };
  }, [walletAddress, fetchCircles]);

  return { circles, loading, error, refresh: fetchCircles };
};

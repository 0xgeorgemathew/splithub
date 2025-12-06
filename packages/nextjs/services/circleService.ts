import { type Circle, type CircleWithMembers, type User, supabase } from "~~/lib/supabase";

/**
 * Get all circles created by a user
 */
export async function getCirclesByCreator(creatorWallet: string): Promise<Circle[]> {
  const normalizedWallet = creatorWallet.toLowerCase();

  const { data, error } = await supabase
    .from("circles")
    .select("*")
    .eq("creator_wallet", normalizedWallet)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch circles: ${error.message}`);
  }

  return (data as Circle[]) || [];
}

/**
 * Get the active circle for a user (used by relayer for auto-split)
 */
export async function getActiveCircle(creatorWallet: string): Promise<Circle | null> {
  const normalizedWallet = creatorWallet.toLowerCase();

  const { data, error } = await supabase
    .from("circles")
    .select("*")
    .eq("creator_wallet", normalizedWallet)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows found
      return null;
    }
    throw new Error(`Failed to fetch active circle: ${error.message}`);
  }

  return data as Circle;
}

/**
 * Get a circle with its members
 */
export async function getCircleWithMembers(circleId: string): Promise<CircleWithMembers | null> {
  // First get the circle
  const { data: circleData, error: circleError } = await supabase
    .from("circles")
    .select("*")
    .eq("id", circleId)
    .single();

  if (circleError) {
    if (circleError.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch circle: ${circleError.message}`);
  }

  // Then get members with user details
  const { data: membersData, error: membersError } = await supabase
    .from("circle_members")
    .select(
      `
      member_wallet,
      users:member_wallet (
        wallet_address,
        name,
        twitter_handle,
        twitter_profile_url,
        chip_address
      )
    `,
    )
    .eq("circle_id", circleId);

  if (membersError) {
    throw new Error(`Failed to fetch circle members: ${membersError.message}`);
  }

  const members = membersData?.map((m: any) => m.users as User).filter(Boolean) || [];

  return {
    ...(circleData as Circle),
    members,
  };
}

/**
 * Get members of a circle (just wallet addresses)
 */
export async function getCircleMembers(circleId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from("circle_members")
    .select(
      `
      users:member_wallet (
        wallet_address,
        name,
        twitter_handle,
        twitter_profile_url,
        chip_address
      )
    `,
    )
    .eq("circle_id", circleId);

  if (error) {
    throw new Error(`Failed to fetch circle members: ${error.message}`);
  }

  return data?.map((m: any) => m.users as User).filter(Boolean) || [];
}

/**
 * Create a new circle with members
 */
export async function createCircle(
  creatorWallet: string,
  name: string,
  memberWallets: string[],
): Promise<CircleWithMembers> {
  const normalizedCreatorWallet = creatorWallet.toLowerCase();
  const normalizedMemberWallets = memberWallets.map(w => w.toLowerCase());

  if (normalizedMemberWallets.length === 0) {
    throw new Error("Must have at least one member in the circle");
  }

  // Deactivate any existing active circles for this user
  await supabase
    .from("circles")
    .update({ is_active: false })
    .eq("creator_wallet", normalizedCreatorWallet)
    .eq("is_active", true);

  // Create the circle
  const { data: circleData, error: circleError } = await supabase
    .from("circles")
    .insert({
      name,
      creator_wallet: normalizedCreatorWallet,
      is_active: true,
    })
    .select()
    .single();

  if (circleError || !circleData) {
    throw new Error(`Failed to create circle: ${circleError?.message}`);
  }

  const circle = circleData as Circle;

  // Add members
  const memberInserts = normalizedMemberWallets.map(wallet => ({
    circle_id: circle.id,
    member_wallet: wallet,
  }));

  const { error: membersError } = await supabase.from("circle_members").insert(memberInserts);

  if (membersError) {
    // Rollback circle creation
    await supabase.from("circles").delete().eq("id", circle.id);
    throw new Error(`Failed to add members: ${membersError.message}`);
  }

  // Fetch the complete circle with members
  const result = await getCircleWithMembers(circle.id);
  if (!result) {
    throw new Error("Failed to fetch created circle");
  }

  return result;
}

/**
 * Update a circle (name and/or members)
 */
export async function updateCircle(
  circleId: string,
  updates: { name?: string; memberWallets?: string[] },
): Promise<CircleWithMembers> {
  // Update name if provided
  if (updates.name) {
    const { error } = await supabase.from("circles").update({ name: updates.name }).eq("id", circleId);

    if (error) {
      throw new Error(`Failed to update circle name: ${error.message}`);
    }
  }

  // Update members if provided
  if (updates.memberWallets) {
    const normalizedMemberWallets = updates.memberWallets.map(w => w.toLowerCase());

    // Remove all existing members
    const { error: deleteError } = await supabase.from("circle_members").delete().eq("circle_id", circleId);

    if (deleteError) {
      throw new Error(`Failed to remove old members: ${deleteError.message}`);
    }

    // Add new members
    const memberInserts = normalizedMemberWallets.map(wallet => ({
      circle_id: circleId,
      member_wallet: wallet,
    }));

    const { error: insertError } = await supabase.from("circle_members").insert(memberInserts);

    if (insertError) {
      throw new Error(`Failed to add new members: ${insertError.message}`);
    }
  }

  // Fetch and return updated circle
  const result = await getCircleWithMembers(circleId);
  if (!result) {
    throw new Error("Failed to fetch updated circle");
  }

  return result;
}

/**
 * Delete a circle
 */
export async function deleteCircle(circleId: string): Promise<void> {
  const { error } = await supabase.from("circles").delete().eq("id", circleId);

  if (error) {
    throw new Error(`Failed to delete circle: ${error.message}`);
  }
}

/**
 * Toggle circle active status
 */
export async function setCircleActive(circleId: string, creatorWallet: string, isActive: boolean): Promise<Circle> {
  const normalizedWallet = creatorWallet.toLowerCase();

  if (isActive) {
    // Deactivate any other active circles for this user
    await supabase
      .from("circles")
      .update({ is_active: false })
      .eq("creator_wallet", normalizedWallet)
      .eq("is_active", true);
  }

  const { data, error } = await supabase
    .from("circles")
    .update({ is_active: isActive })
    .eq("id", circleId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update circle status: ${error.message}`);
  }

  return data as Circle;
}

/**
 * Leave a circle (for members)
 */
export async function leaveCircle(circleId: string, memberWallet: string): Promise<void> {
  const normalizedWallet = memberWallet.toLowerCase();

  const { error } = await supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId)
    .eq("member_wallet", normalizedWallet);

  if (error) {
    throw new Error(`Failed to leave circle: ${error.message}`);
  }
}

/**
 * Get circles that a user is a member of (not creator)
 */
export async function getCirclesAsMember(memberWallet: string): Promise<CircleWithMembers[]> {
  const normalizedWallet = memberWallet.toLowerCase();

  const { data, error } = await supabase
    .from("circle_members")
    .select(
      `
      circle_id,
      circles:circle_id (*)
    `,
    )
    .eq("member_wallet", normalizedWallet);

  if (error) {
    throw new Error(`Failed to fetch circles as member: ${error.message}`);
  }

  // Fetch full details for each circle
  const circles: CircleWithMembers[] = [];
  for (const item of data || []) {
    const circle = await getCircleWithMembers((item as any).circle_id);
    if (circle) {
      circles.push(circle);
    }
  }

  return circles;
}

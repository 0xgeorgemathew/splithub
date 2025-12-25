"use client";

import { Users } from "lucide-react";
import { UserAvatar } from "~~/components/shared/UserAvatar";
import { AVATAR_SIZE_RATIOS, CIRCLE_POSITIONS } from "~~/constants/ui";
import { type User as UserType } from "~~/lib/supabase";

interface CircleCollageProps {
  members: UserType[];
  size?: number;
}

// Avatar component for consistent rendering - uses shared UserAvatar with ring styling
const MemberAvatar = ({ member, size }: { member: UserType; size: number }) => (
  <UserAvatar
    user={{
      twitter_profile_url: member.twitter_profile_url,
      name: member.name,
    }}
    size={size}
    showRing
    ringColor="ring-base-100"
  />
);

/**
 * Circle visualization with overlapping avatars.
 * Handles 0, 1, 2, 3, and 4+ member layouts.
 */
export const CircleCollage = ({ members, size = 80 }: CircleCollageProps) => {
  const memberCount = members.length;

  // Empty state
  if (memberCount === 0) {
    return (
      <div
        className="rounded-full bg-gradient-to-br from-base-300/60 to-base-300/30 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Users className="w-1/3 h-1/3 text-base-content/40" />
      </div>
    );
  }

  // Single member - full circle
  if (memberCount === 1) {
    return (
      <UserAvatar
        user={{
          twitter_profile_url: members[0].twitter_profile_url,
          name: members[0].name,
        }}
        size={size}
      />
    );
  }

  // 2 members - horizontal centered overlap
  if (memberCount === 2) {
    const avatarSize = size * AVATAR_SIZE_RATIOS.TWO_MEMBERS;
    return (
      <div
        className="rounded-full bg-gradient-to-br from-base-300/40 to-base-300/20 relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="flex items-center">
          <MemberAvatar member={members[0]} size={avatarSize} />
          <div style={{ marginLeft: -avatarSize * 0.25 }}>
            <MemberAvatar member={members[1]} size={avatarSize} />
          </div>
        </div>
      </div>
    );
  }

  // 3 members - triangle arrangement
  if (memberCount === 3) {
    const avatarSize = size * AVATAR_SIZE_RATIOS.THREE_MEMBERS;
    const offset = size * CIRCLE_POSITIONS.TRIANGLE_OFFSET;
    return (
      <div
        className="rounded-full bg-gradient-to-br from-base-300/40 to-base-300/20 relative"
        style={{ width: size, height: size }}
      >
        <div className="absolute" style={{ top: offset, left: "50%", transform: "translateX(-50%)" }}>
          <MemberAvatar member={members[0]} size={avatarSize} />
        </div>
        <div className="absolute" style={{ bottom: offset, left: offset }}>
          <MemberAvatar member={members[1]} size={avatarSize} />
        </div>
        <div className="absolute" style={{ bottom: offset, right: offset }}>
          <MemberAvatar member={members[2]} size={avatarSize} />
        </div>
      </div>
    );
  }

  // 4+ members - stacked fan arrangement
  const avatarSize = size * AVATAR_SIZE_RATIOS.FOUR_PLUS_MEMBERS;
  const displayMembers = members.slice(0, 4);
  const remaining = memberCount - 4;

  return (
    <div
      className="rounded-full bg-gradient-to-br from-base-300/40 to-base-300/20 relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div className="relative" style={{ width: avatarSize * 2, height: avatarSize }}>
        {displayMembers.slice(0, 3).map((member, i) => (
          <div
            key={member.wallet_address}
            className="absolute"
            style={{
              left: i * (avatarSize * CIRCLE_POSITIONS.FAN_OVERLAP),
              zIndex: 3 - i,
              transform: `rotate(${(i - 1) * CIRCLE_POSITIONS.FAN_ROTATION_DEG}deg)`,
            }}
          >
            <MemberAvatar member={member} size={avatarSize} />
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <div
          className="absolute bottom-1 right-1 bg-base-300 rounded-full flex items-center justify-center ring-2 ring-base-100"
          style={{ width: size * 0.32, height: size * 0.32 }}
        >
          <span className="text-[10px] font-bold text-base-content/70">+{remaining}</span>
        </div>
      )}
    </div>
  );
};

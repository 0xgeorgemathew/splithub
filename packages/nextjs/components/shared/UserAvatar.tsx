"use client";

import Image from "next/image";

interface UserAvatarProps {
  /** User object with optional twitter_profile_url and name */
  user: {
    twitter_profile_url?: string | null;
    name: string;
  };
  /** Size of the avatar in pixels */
  size: number;
  /** Additional CSS classes */
  className?: string;
  /** Show a ring around the avatar */
  showRing?: boolean;
  /** Ring color class (e.g., "ring-base-100", "ring-primary") */
  ringColor?: string;
  /** Ring width in pixels (default: 2) */
  ringWidth?: number;
}

/**
 * Shared UserAvatar component for consistent avatar rendering across the app.
 * Displays Twitter profile image if available, otherwise shows initials.
 */
export const UserAvatar = ({
  user,
  size,
  className = "",
  showRing = false,
  ringColor = "ring-base-100",
  ringWidth = 2,
}: UserAvatarProps) => {
  const initial = user.name.charAt(0).toUpperCase();
  const ringClass = showRing ? `ring-${ringWidth} ${ringColor}` : "";

  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 ${ringClass} ${className}`}
      style={{ width: size, height: size }}
    >
      {user.twitter_profile_url ? (
        <Image
          src={user.twitter_profile_url}
          alt={user.name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center">
          <span className="font-bold text-primary" style={{ fontSize: size * 0.4 }}>
            {initial}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Smaller variant with customized styling for chips/tags
 */
export const UserAvatarSmall = ({
  user,
  size = 16,
  className = "",
}: Pick<UserAvatarProps, "user" | "size" | "className">) => {
  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div className={`rounded-full overflow-hidden flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {user.twitter_profile_url ? (
        <Image
          src={user.twitter_profile_url}
          alt={user.name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-primary/30 flex items-center justify-center">
          <span className="font-bold text-primary" style={{ fontSize: size * 0.45 }}>
            {initial}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Balance list variant with specific styling for BalancesLiveFeed
 */
export const BalanceAvatar = ({ user, size = 44 }: Pick<UserAvatarProps, "user" | "size">) => {
  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: size, height: size }}>
      {user.twitter_profile_url ? (
        <Image
          src={user.twitter_profile_url}
          alt={user.name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-[#2a2a2a] border border-white/10 flex items-center justify-center">
          <span className="text-base font-bold text-white/80">{initial}</span>
        </div>
      )}
    </div>
  );
};

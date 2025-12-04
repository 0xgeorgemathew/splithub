"use client";

import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { LogIn, LogOut, User } from "lucide-react";

export const TopNav = () => {
  const { ready, authenticated, login, logout, user } = usePrivy();

  const twitterHandle = user?.twitter?.username;
  const profilePic = user?.twitter?.profilePictureUrl;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-base-100 border-b border-base-300">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="text-xl font-bold">SplitHub</div>

        {/* Auth Button */}
        {!ready ? (
          <div className="w-8 h-8 rounded-full bg-base-300 animate-pulse" />
        ) : !authenticated ? (
          <button onClick={login} className="btn btn-primary btn-sm gap-2">
            <LogIn className="w-4 h-4" />
            Login with Twitter
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {/* User Info */}
            <div className="flex items-center gap-2">
              {profilePic ? (
                <Image
                  src={profilePic}
                  alt={twitterHandle || "User"}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
              <span className="text-sm font-medium">@{twitterHandle}</span>
            </div>

            {/* Logout */}
            <button onClick={logout} className="btn btn-ghost btn-sm btn-circle">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

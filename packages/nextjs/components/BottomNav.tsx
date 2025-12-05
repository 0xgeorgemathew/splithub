"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Bell, Coins, Home, Split } from "lucide-react";
import { useRequestNotifications } from "~~/hooks/useRequestNotifications";

const mainNavItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Splits", href: "/splits", icon: Split },
  { label: "Credits", href: "/credits", icon: Coins },
  { label: "Requests", href: "/requests", icon: Bell },
];

export const BottomNav = () => {
  const pathname = usePathname();
  const { authenticated } = usePrivy();
  const { count: notificationCount } = useRequestNotifications();

  // Don't show bottom nav on certain pages
  const hideBottomNav = ["/register", "/re-register"].includes(pathname);

  if (hideBottomNav || !authenticated) {
    return null;
  }

  const isActiveRoute = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl">
        <div
          className="bg-base-100/95 backdrop-blur-lg rounded-full border border-base-300/50 px-3 py-2"
          style={{
            boxShadow:
              "0 4px 20px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
        >
          <ul className="flex items-center justify-around">
            {/* Main Nav Items */}
            {mainNavItems.map(({ label, href, icon: Icon }) => {
              const isActive = isActiveRoute(href);
              const showBadge = label === "Requests" && notificationCount > 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200 relative ${
                      isActive
                        ? "bg-primary text-primary-content"
                        : "text-base-content/40 hover:bg-base-200/50 hover:text-base-content/70"
                    }`}
                    style={
                      isActive
                        ? { boxShadow: "0 2px 8px rgba(242, 169, 0, 0.4), inset 0 1px 1px rgba(255,255,255,0.15)" }
                        : {}
                    }
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                    <span className="text-[10px] font-semibold">{label}</span>
                    {/* Notification Badge */}
                    {showBadge && (
                      <div className="absolute -top-0.5 right-1.5 min-w-[16px] h-4 px-1 bg-error text-error-content text-[10px] font-bold rounded-full flex items-center justify-center border border-base-100">
                        {notificationCount}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
};

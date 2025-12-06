"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "framer-motion";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't show bottom nav on certain pages
  const hideBottomNav = ["/register", "/re-register"].includes(pathname);

  if (hideBottomNav || !authenticated) {
    return null;
  }

  const isActiveRoute = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const activeIndex = mainNavItems.findIndex(item => isActiveRoute(item.href));

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 25, delay: 0.1 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md"
    >
      <motion.div
        className="bg-base-100/95 backdrop-blur-xl rounded-full border border-base-content/10 px-2 py-2"
        style={{
          boxShadow:
            "0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <ul className="flex items-center justify-around relative">
          {/* Animated pill background */}
          {mounted && activeIndex >= 0 && (
            <motion.div
              layoutId="navPill"
              className="absolute h-[calc(100%-6px)] rounded-full bg-primary"
              style={{
                width: `calc(${100 / mainNavItems.length}% - 6px)`,
                left: `calc(${(activeIndex / mainNavItems.length) * 100}% + 3px)`,
                boxShadow: "0 4px 16px rgba(242, 169, 0, 0.45), inset 0 1px 1px rgba(255,255,255,0.15)",
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 35,
              }}
            />
          )}

          {/* Nav Items */}
          {mainNavItems.map(({ label, href, icon: Icon }) => {
            const isActive = isActiveRoute(href);
            const showBadge = label === "Requests" && notificationCount > 0;
            return (
              <li key={href} className="flex-1 z-10">
                <Link
                  href={href}
                  className="flex flex-col items-center gap-0.5 py-2.5 rounded-full transition-colors duration-150 relative"
                >
                  <motion.div
                    animate={{
                      scale: isActive ? 1.15 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors duration-150 ${
                        isActive ? "text-primary-content" : "text-base-content/50"
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </motion.div>
                  <span
                    className={`text-[10px] font-semibold transition-colors duration-150 ${
                      isActive ? "text-primary-content" : "text-base-content/50"
                    }`}
                  >
                    {label}
                  </span>

                  {/* Notification Badge */}
                  <AnimatePresence>
                    {showBadge && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className="absolute -top-1 right-1 min-w-[18px] h-[18px] px-1.5 bg-error text-error-content text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-base-100"
                        style={{
                          boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)",
                        }}
                      >
                        {notificationCount > 9 ? "9+" : notificationCount}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </motion.nav>
  );
};

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, RefreshCw, Send, ShieldCheck, Users } from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Settle", href: "/settle", icon: Send },
  { label: "Multi", href: "/multi-settle", icon: Users },
  { label: "Approve", href: "/approve", icon: ShieldCheck },
  { label: "Re-register", href: "/re-register", icon: RefreshCw },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl">
      <div className="bg-base-100/95 backdrop-blur-lg rounded-full shadow-lg border border-base-300/50 px-4 py-2.5">
        <ul className="flex items-center justify-around">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-full transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-content shadow-md"
                      : "text-base-content/50 hover:bg-base-200 hover:text-base-content"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                  <span className="text-[10px] font-semibold">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

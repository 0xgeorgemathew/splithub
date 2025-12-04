"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, RefreshCw, ShieldCheck, Split } from "lucide-react";

const navItems = [
  { label: "Splits", href: "/splits", icon: Split },
  { label: "Credits", href: "/credits", icon: Coins },
  { label: "Approve", href: "/approve", icon: ShieldCheck },
  { label: "Re-register", href: "/re-register", icon: RefreshCw },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl">
      <div
        className="bg-base-100/95 backdrop-blur-lg rounded-full border border-base-300/50 px-3 py-2"
        style={{
          boxShadow:
            "0 4px 20px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        <ul className="flex items-center justify-around">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
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
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  Home,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/utils/constants";

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  users: Users,
  building: Building2,
  activity: Activity,
  user: User,
};

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card lg:hidden"
      style={{ height: "var(--bottom-nav-height)" }}
      aria-label="Main navigation"
    >
      <ul className="flex h-full items-stretch justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon] ?? Home;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    isActive && "text-gold",
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
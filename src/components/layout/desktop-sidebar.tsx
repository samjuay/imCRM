"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  Home,
  User,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";
import { APP_NAME, NAV_ITEMS, ROUTES } from "@/utils/constants";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { usePermissionStore } from "@/store/permission-store";

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  users: Users,
  building: Building2,
  activity: Activity,
  user: User,
  userCog: UserCog,
};

export function DesktopSidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const { can, isLoading: permissionLoading } = usePermissions();

  console.log(
    "[DESKTOP SIDEBAR]",
    {
      permissionLoading,
      permissions: usePermissionStore.getState().permissions
    }
  );

  if (permissionLoading) {
    return (
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:border-r lg:border-border lg:bg-primary lg:text-primary-foreground transition-all duration-300",
          isSidebarCollapsed ? "lg:w-16" : "lg:w-[var(--sidebar-width)]",
        )}
      >
        <div className="flex h-16 items-center border-b border-white/10 px-4">
          {!isSidebarCollapsed && (
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
              <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-gold-foreground">
                CRM
              </span>
            </Link>
          )}
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Sidebar navigation">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse bg-white/5 rounded-lg" />
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:border-r lg:border-border lg:bg-primary lg:text-primary-foreground transition-all duration-300",
        isSidebarCollapsed ? "lg:w-16" : "lg:w-[var(--sidebar-width)]",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-white/10 px-4",
          isSidebarCollapsed ? "justify-center" : "justify-between",
        )}
      >
        {!isSidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
            <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-gold-foreground">
              CRM
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Sidebar navigation">
        {NAV_ITEMS.filter((item) => {
          if (item.href === ROUTES.users) return can("users", "view");
          if (item.permission) return can(item.permission, "view");
          return true;
        }).map((item) => {
          const Icon = iconMap[item.icon] ?? Home;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isSidebarCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gold text-gold-foreground"
                  : "text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground",
                isSidebarCollapsed && "justify-center px-2",
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              {!isSidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        {!isSidebarCollapsed && (
          <p className="text-xs text-primary-foreground/50">
            Real Estate Channel Partner CRM
          </p>
        )}
      </div>
    </aside>
  );
}
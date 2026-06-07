"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);

  return (
    <AuthGuard>
      <div className="min-h-full bg-background">
        <DesktopSidebar />
        <div
          className={cn(
            "flex min-h-full flex-col transition-all duration-300 lg:pl-[var(--sidebar-width)]",
            isSidebarCollapsed && "lg:pl-16",
          )}
        >
          <main
            className="flex-1 px-4 py-6 md:px-6 lg:px-8"
            style={{ paddingBottom: "calc(var(--bottom-nav-height) + 1.5rem)" }}
          >
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
          <BottomNavigation />
        </div>
      </div>
    </AuthGuard>
  );
}
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { usePermissionStore } from "@/store/permission-store";
import { ROUTES } from "@/utils/constants";

export function SettingsGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated, profile } = useAuth();
  const { can, isLoading: permissionLoading } = usePermissions();

  const hasSettingsAccess = can("settings", "view");

  useEffect(() => {
    if (isLoading || permissionLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace(ROUTES.login);
      return;
    }

    if (!profile) {
      router.replace(ROUTES.unauthorized);
      return;
    }

    console.log(
      "[SETTINGS GUARD]",
      {
        permissionLoading,
        hasSettingsAccess,
        permissions: usePermissionStore.getState().permissions
      }
    );

    if (!hasSettingsAccess) {
      router.replace(ROUTES.unauthorized);
      return;
    }
  }, [isLoading, permissionLoading, isAuthenticated, profile, hasSettingsAccess, router]);

  if (isLoading || permissionLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-xl border" />
          <Skeleton className="h-32 w-full rounded-xl border" />
          <Skeleton className="h-32 w-full rounded-xl border" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-xl border" />
          <Skeleton className="h-32 w-full rounded-xl border" />
          <Skeleton className="h-32 w-full rounded-xl border" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile || !hasSettingsAccess) {
    return null;
  }

  return <>{children}</>;
}
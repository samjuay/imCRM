"use client";

import { usePermissionStore } from "@/store/permission-store";
import type { PermissionAction, PermissionModule } from "@/types/permissions";

export function usePermissions() {
  const permissions = usePermissionStore((state) => state.permissions);
  const isLoading = usePermissionStore((state) => state.isLoading);
  const can = usePermissionStore((state) => state.can);

  return {
    permissions,
    isLoading,
    can: (module: PermissionModule, action: PermissionAction) =>
      can(module, action),
  };
}
import { create } from "zustand";
import { permissionService } from "@/services/permissions";
import type { UserRole } from "@/types/auth";
import type {
  PermissionAction,
  PermissionModule,
  RolePermission,
} from "@/types/permissions";

type PermissionState = {
  permissions: RolePermission[];
  isLoading: boolean;
  loadedRole: UserRole | null;
  loadByRole: (role: UserRole) => Promise<void>;
  can: (module: PermissionModule, action: PermissionAction) => boolean;
  reset: () => void;
};

const initialState = {
  permissions: [] as RolePermission[],
  isLoading: false,
  loadedRole: null as UserRole | null,
};

function resolveAction(
  permission: RolePermission,
  action: PermissionAction,
): boolean {
  switch (action) {
    case "view":
      return permission.can_view;
    case "create":
      return permission.can_create;
    case "edit":
      return permission.can_edit;
    case "delete":
      return permission.can_delete;
    default:
      return false;
  }
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  ...initialState,

  reset: () => {
    set(initialState);
  },

  loadByRole: async (role) => {
    if (get().loadedRole === role) {
      console.log('[AUTH] loadByRole skipped - already loaded');
      return;
    }

    console.log('[PERMISSION] role requested:', role);
    console.log('[AUTH] PERMISSIONS loadByRole START');
    set({ isLoading: true });

    const { data, error } = await permissionService.getByRole(role);

    if (error) {
      set({ isLoading: false });
      console.log('[AUTH] PERMISSIONS loadByRole ERROR');
      return;
    }

    console.log("[PERMISSION] rows returned:", data);
    console.log("[PERMISSION] row count:", data?.length);

    set({
      permissions: (data ?? []) as RolePermission[],
      isLoading: false,
      loadedRole: role,
    });
    console.log('[AUTH] PERMISSIONS loadByRole COMPLETE');
  },

  can: (module, action) => {
    console.log(
      "[PERMISSION] can check",
      {
        module,
        action,
        permissions: get().permissions
      }
    );
    const permission = get().permissions.find((p) => p.module_name === module);
    if (!permission) {
      return false;
    }
    return resolveAction(permission, action);
  },
}));
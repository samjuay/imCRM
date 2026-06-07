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
      return;
    }

    set({ isLoading: true });

    const { data, error } = await permissionService.getByRole(role);

    if (error) {
      set({ isLoading: false });
      return;
    }

    set({
      permissions: (data ?? []) as RolePermission[],
      isLoading: false,
      loadedRole: role,
    });
  },

  can: (module, action) => {
    const permission = get().permissions.find((p) => p.module_name === module);
    if (!permission) {
      return false;
    }
    return resolveAction(permission, action);
  },
}));
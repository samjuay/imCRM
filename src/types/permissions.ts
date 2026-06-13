import type { UserRole } from "@/types/auth";

export const PERMISSION_MODULES = [
  "dashboard",
  "projects",
  "leads",
  "lead_sources",
  "followups",
  "site_visits",
  "reports",
  "users",
  "teams",
  "master_data",
  "permissions",
  "settings",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export type RolePermission = {
  id: string;
  role: UserRole;
  module_name: PermissionModule;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export type PermissionAction = "view" | "create" | "edit" | "delete";

export type CreateRolePermissionInput = {
  role: UserRole;
  module_name: PermissionModule;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
};

export type UpdateRolePermissionInput = Partial<
  Omit<CreateRolePermissionInput, "role" | "module_name">
>;
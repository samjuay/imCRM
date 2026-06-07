import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import type { UserRole } from "@/types/auth";
import type {
  CreateRolePermissionInput,
  RolePermission,
  UpdateRolePermissionInput,
} from "@/types/permissions";

export const permissionService = {
  async getByRole(role: UserRole) {
    const supabase = createClient();
    return supabase
      .from("role_permissions")
      .select("*")
      .eq("role", role)
      .order("module_name", { ascending: true });
  },

  async getByCompany(companyId: string, role: UserRole) {
    requireCompanyId(companyId);
    return permissionService.getByRole(role);
  },

  async getById(id: string) {
    const supabase = createClient();
    return supabase
      .from("role_permissions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
  },

  async create(input: CreateRolePermissionInput) {
    const supabase = createClient();
    return supabase.from("role_permissions").insert(input).select().single();
  },

  async update(id: string, input: UpdateRolePermissionInput) {
    const supabase = createClient();
    return supabase
      .from("role_permissions")
      .update(input)
      .eq("id", id)
      .select()
      .single();
  },

  async delete(id: string) {
    const supabase = createClient();
    return supabase.from("role_permissions").delete().eq("id", id);
  },
};

export type { RolePermission };
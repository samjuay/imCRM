import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import type {
  CreateProjectInventoryInput,
  ProjectInventory,
  UpdateProjectInventoryInput,
} from "@/types/project";

export const projectInventoryService = {
  async getByCompany(companyId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("project_inventory")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .order("created_at", { ascending: false });
  },

  async getById(companyId: string, id: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("project_inventory")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .maybeSingle();
  },

  async getByProject(companyId: string, projectId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("project_inventory")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
  },

  async create(companyId: string, input: CreateProjectInventoryInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("project_inventory")
      .insert({ ...input, company_id: scopedCompanyId })
      .select()
      .single();
  },

  async update(
    companyId: string,
    id: string,
    input: UpdateProjectInventoryInput,
  ) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("project_inventory")
      .update(input)
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .select()
      .single();
  },

  async delete(companyId: string, id: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("project_inventory")
      .delete()
      .eq("company_id", scopedCompanyId)
      .eq("id", id);
  },
};

export type { ProjectInventory };
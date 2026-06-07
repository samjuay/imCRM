import { createClient } from "@/lib/supabase/client";
import { requireCompanyId } from "@/lib/database/company-scope";
import type {
  CreateProjectConfigurationInput,
  ProjectConfiguration,
  UpdateProjectConfigurationInput,
} from "@/types/project";

export const projectConfigurationService = {
  async getByCompany(companyId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("project_configurations")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .order("created_at", { ascending: false });
  },

  async getById(companyId: string, id: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("project_configurations")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .eq("id", id)
      .maybeSingle();
  },

  async getByProject(companyId: string, projectId: string) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("project_configurations")
      .select("*")
      .eq("company_id", scopedCompanyId)
      .eq("project_id", projectId)
      .order("configuration_name", { ascending: true });
  },

  async create(companyId: string, input: CreateProjectConfigurationInput) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("project_configurations")
      .insert({ ...input, company_id: scopedCompanyId })
      .select()
      .single();
  },

  async update(
    companyId: string,
    id: string,
    input: UpdateProjectConfigurationInput,
  ) {
    const scopedCompanyId = requireCompanyId(companyId);
    const supabase = createClient();
    return supabase
      .from("project_configurations")
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
      .from("project_configurations")
      .delete()
      .eq("company_id", scopedCompanyId)
      .eq("id", id);
  },
};

export type { ProjectConfiguration };